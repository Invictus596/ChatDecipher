import Dexie, { type EntityTable } from "dexie";

/**
 * Local-first persistence.
 *
 * Everything the app knows about a user's chats lives in this IndexedDB
 * database. There is no sync layer and no server round-trip on the free tier.
 */

export type ChatPlatform = "whatsapp" | "telegram" | "unknown";

export type ThemePreference = "light" | "dark" | "system";

export interface ParsedChat {
  /** Stable local id (`crypto.randomUUID()`). */
  id: string;
  platform: ChatPlatform;
  /** Human-friendly name shown in the library. */
  contactName: string;
  /** 0 until the Phase 2 parser indexes the export. */
  messageCount: number;
  /** Raw export text, split into token-friendly chunks by later phases. */
  rawChunks: string[];
  /** Import time, epoch milliseconds. */
  timestamp: number;
}

export interface UserPreferences {
  /** Singleton row. */
  id: "app";
  theme: ThemePreference;
  premiumStatus: boolean;
  updatedAt: number;
}

export const DB_NAME = "chat-analyse";
export const PREFERENCES_ID = "app" as const;

export function createDefaultPreferences(): UserPreferences {
  return {
    id: PREFERENCES_ID,
    theme: "system",
    premiumStatus: false,
    updatedAt: Date.now(),
  };
}

class ChatAnalyseDatabase extends Dexie {
  parsedChats!: EntityTable<ParsedChat, "id">;
  userPreferences!: EntityTable<UserPreferences, "id">;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      // Indexed columns only — rawChunks stays out of the index to keep it light.
      parsedChats: "id, platform, contactName, timestamp",
      userPreferences: "id",
    });
  }
}

let database: ChatAnalyseDatabase | null = null;

/**
 * Lazy singleton so module evaluation during static prerendering never opens
 * IndexedDB. All consumers call this from client-side code paths.
 */
export function getDb(): ChatAnalyseDatabase {
  if (!database) {
    database = new ChatAnalyseDatabase();
  }
  return database;
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
