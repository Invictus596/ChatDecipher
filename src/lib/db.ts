import Dexie, { type EntityTable } from "dexie";
import type { ChatMetrics } from "@/lib/metrics";

/**
 * Local-first persistence.
 *
 * Everything the app knows about a user's chats lives in this IndexedDB
 * database. There is no sync layer and no server round-trip on the free tier.
 */

export type ChatPlatform = "whatsapp" | "telegram" | "unknown";

export type ChatStatus = "queued" | "parsed" | "error";

export type ThemePreference = "light" | "dark" | "system";

export interface ParsedChat {
  /** Stable local id (`crypto.randomUUID()`). */
  id: string;
  platform: ChatPlatform;
  /** Human-friendly name shown in the library. */
  contactName: string;
  /** Parsed message count; 0 while queued or if parsing failed. */
  messageCount: number;
  /** Raw export text, split into token-friendly chunks by later phases. */
  rawChunks: string[];
  /** Import time, epoch milliseconds. */
  timestamp: number;
  /**
   * Parse state. Records created before Phase 2 have no status and are treated
   * as queued, so they upgrade automatically the first time the analyzer opens.
   */
  status?: ChatStatus;
  /** Derived on-device metrics for the dashboard (Phase 2). */
  metrics?: ChatMetrics;
  parsedAt?: number;
  parserVersion?: number;
  /** Human-readable reason shown when an export cannot be parsed. */
  parseError?: string;
}

export interface UserPreferences {
  /** Singleton row. */
  id: "app";
  theme: ThemePreference;
  premiumStatus: boolean;
  updatedAt: number;
}

export const DB_NAME = "chatdecipher";

/**
 * Pre-rename database. Kept only so Phase 1 test imports can be migrated once;
 * safe to remove after the first public release.
 */
const LEGACY_DB_NAME = "chat-analyse";

const CHAT_STORES = {
  // Indexed columns only — rawChunks stays out of the index to keep it light.
  parsedChats: "id, platform, contactName, timestamp",
  userPreferences: "id",
} as const;

export const PREFERENCES_ID = "app" as const;

export function createDefaultPreferences(): UserPreferences {
  return {
    id: PREFERENCES_ID,
    theme: "system",
    premiumStatus: false,
    updatedAt: Date.now(),
  };
}

/** Phase 1 rows have no status yet; they behave as queued. */
export function getChatStatus(chat: Pick<ParsedChat, "status">): ChatStatus {
  return chat.status ?? "queued";
}

class ChatDecipherDatabase extends Dexie {
  parsedChats!: EntityTable<ParsedChat, "id">;
  userPreferences!: EntityTable<UserPreferences, "id">;

  constructor() {
    super(DB_NAME);

    this.version(1).stores(CHAT_STORES);
  }
}

let database: ChatDecipherDatabase | null = null;

/**
 * Lazy singleton so module evaluation during static prerendering never opens
 * IndexedDB. All consumers call this from client-side code paths.
 */
export function getDb(): ChatDecipherDatabase {
  if (!database) {
    database = new ChatDecipherDatabase();
  }
  return database;
}

/**
 * Copies data from the pre-rename database into `chatdecipher` once, then
 * removes the legacy database. Best-effort: a failure never blocks startup.
 */
export async function migrateLegacyDatabase(): Promise<void> {
  if (
    typeof indexedDB === "undefined" ||
    typeof indexedDB.databases !== "function"
  ) {
    return;
  }

  try {
    const databases = await indexedDB.databases();
    if (!databases.some((entry) => entry.name === LEGACY_DB_NAME)) return;

    const legacy = new Dexie(LEGACY_DB_NAME);
    legacy.version(1).stores({ ...CHAT_STORES });
    await legacy.open();

    const [chats, preferences] = await Promise.all([
      legacy.table<ParsedChat, string>("parsedChats").toArray(),
      legacy.table<UserPreferences, string>("userPreferences").toArray(),
    ]);
    legacy.close();

    if (chats.length > 0 || preferences.length > 0) {
      const db = getDb();
      await db.transaction(
        "rw",
        db.parsedChats,
        db.userPreferences,
        async () => {
          if (chats.length > 0) await db.parsedChats.bulkPut(chats);
          if (preferences.length > 0) {
            await db.userPreferences.bulkPut(preferences);
          }
        },
      );
    }

    await Dexie.delete(LEGACY_DB_NAME);
  } catch {
    // Ignore: the new database still starts cleanly.
  }
}

/** Reads the singleton preferences row, creating it on first run. */
export async function ensurePreferences(): Promise<UserPreferences> {
  const db = getDb();
  const existing = await db.userPreferences.get(PREFERENCES_ID);
  if (existing) return existing;

  const defaults = createDefaultPreferences();
  await db.userPreferences.put(defaults);
  return defaults;
}

/** Wipes chat data only — preferences (theme, plan) survive. */
export async function clearChatLibrary(): Promise<void> {
  await getDb().parsedChats.clear();
}

/** Factory reset for the local database. */
export async function resetLocalData(): Promise<UserPreferences> {
  const db = getDb();
  await db.transaction("rw", db.parsedChats, db.userPreferences, async () => {
    await db.parsedChats.clear();
    await db.userPreferences.clear();
  });
  return ensurePreferences();
}
