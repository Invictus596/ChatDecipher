import { getDb, type ChatStatus, type ParsedChat } from "@/lib/db";
import { computeChatMetrics } from "@/lib/metrics";
import { parseTelegramExport } from "@/lib/parsers/telegram";
import type { ChatParseResult } from "@/lib/parsers/types";
import { parseWhatsAppExport } from "@/lib/parsers/whatsapp";

/**
 * Bump when the parser output changes enough that stored metrics should be
 * regenerated. The analyzer reparses queued/older imports, and the manual
 * "Reparse" action forces a refresh.
 */
export const PARSER_VERSION = 1;

export function parseChatRecord(
  chat: Pick<ParsedChat, "platform" | "rawChunks">,
): ChatParseResult {
  const raw = chat.rawChunks.join("");

  if (raw.trim().length === 0) {
    throw new Error("This export is empty.");
  }

  if (chat.platform === "telegram") return parseTelegramExport(raw);
  if (chat.platform === "whatsapp") return parseWhatsAppExport(raw);

  throw new Error("Unknown chat platform. Use a WhatsApp .txt or Telegram .json export.");
}

export interface ProcessChatOptions {
  /** Reparse even when the stored parser version is current. */
  force?: boolean;
}

/**
 * Parses one stored export, computes metrics, and persists the result.
 * Everything happens in the browser; this function never performs a network
 * request.
 */
export async function processChat(
  chatId: string,
  options: ProcessChatOptions = {},
): Promise<ChatStatus> {
  const db = getDb();
  const chat = await db.parsedChats.get(chatId);

  if (!chat) return "error";

  if (
    !options.force &&
    chat.status === "parsed" &&
    chat.parserVersion === PARSER_VERSION &&
    chat.metrics
  ) {
    return "parsed";
  }

  try {
    const parsed = parseChatRecord(chat);
    const metrics = computeChatMetrics(parsed.messages);

    if (metrics.totalMessages === 0) {
      throw new Error("No text messages found in this export.");
    }

    await db.transaction("rw", db.parsedChats, db.chatMessages, async () => {
      await db.parsedChats.update(chatId, {
        status: "parsed",
        messageCount: metrics.totalMessages,
        metrics,
        parsedAt: Date.now(),
        parserVersion: PARSER_VERSION,
        parseError: undefined,
        ...(parsed.title ? { contactName: parsed.title } : {}),
      });

      // Phase 3 keeps the normalized array locally so the AI sampler does not
      // need to reparse the raw export. It lives in a separate table to keep
      // the dashboard's live query small.
      await db.chatMessages.put({
        chatId,
        messages: parsed.messages,
        updatedAt: Date.now(),
      });
    });

    return "parsed";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not parse this export.";

    await db.transaction("rw", db.parsedChats, db.chatMessages, async () => {
      await db.parsedChats.update(chatId, {
        status: "error",
        messageCount: 0,
        metrics: undefined,
        parsedAt: Date.now(),
        parserVersion: PARSER_VERSION,
        parseError: message.slice(0, 280),
      });
      await db.chatMessages.delete(chatId);
    });

    return "error";
  }
}
