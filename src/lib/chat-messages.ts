import { getDb } from "@/lib/db";
import { parseChatRecord } from "@/lib/process-chat";
import type { NormalizedMessage } from "@/lib/parsers/types";

/**
 * Loads the normalized message array for one local chat.
 *
 * New imports persist this alongside their metrics. Phase 2 records predate the
 * cache, so they are parsed once on demand and backfilled into Dexie. Nothing
 * here leaves the browser.
 */
export async function loadChatMessages(
  chatId: string,
): Promise<NormalizedMessage[]> {
  const db = getDb();
  const stored = await db.chatMessages.get(chatId);
  if (stored) return stored.messages;

  const chat = await db.parsedChats.get(chatId);
  if (!chat) return [];

  const parsed = parseChatRecord(chat);
  await db.chatMessages.put({
    chatId,
    messages: parsed.messages,
    updatedAt: Date.now(),
  });

  return parsed.messages;
}
