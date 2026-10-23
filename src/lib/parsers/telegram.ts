import type {
  ChatParseResult,
  NormalizedMessage,
} from "@/lib/parsers/types";

type UnknownRecord = Record<string, unknown>;

type TelegramTextPart =
  | string
  | {
      type?: string;
      text?: string;
    };

type TelegramMessage = {
  type?: string;
  date?: string;
  date_unixtime?: string;
  from?: string;
  actor?: string;
  text?: string | TelegramTextPart[];
  text_entities?: Array<{ text?: string }>;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function extractText(message: TelegramMessage): string {
  if (typeof message.text === "string") return message.text;

  if (Array.isArray(message.text)) {
    const joined = message.text
      .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
      .join("");
    if (joined.length > 0) return joined;
  }

  if (Array.isArray(message.text_entities)) {
    return message.text_entities
      .map((entity) => (typeof entity.text === "string" ? entity.text : ""))
      .join("");
  }

  return "";
}

function parseDate(message: TelegramMessage): number | null {
  // date_unixtime is generated in UTC and is the most reliable source.
  if (message.date_unixtime !== undefined) {
    const seconds = Number(message.date_unixtime);
    if (Number.isFinite(seconds) && seconds > 0) {
      const timestamp = seconds * 1000;
      const earliest = Date.UTC(2000, 0, 1);
      const latest = Date.UTC(2100, 0, 1);
      if (timestamp >= earliest && timestamp < latest) return timestamp;
    }
  }

  if (typeof message.date === "string") {
    const timestamp = Date.parse(message.date);
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return null;
}

export function parseTelegramExport(raw: string): ChatParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(
      "This file isn't valid Telegram JSON. Export the chat as JSON from Telegram Desktop.",
    );
  }

  const root = isRecord(parsed) ? parsed : null;
  const rawMessages = Array.isArray(parsed)
    ? parsed
    : root && Array.isArray(root.messages)
      ? root.messages
      : null;

  if (!rawMessages) {
    throw new Error(
      "No Telegram messages array found. Use Telegram Desktop → Export chat history → JSON.",
    );
  }

  const messages: NormalizedMessage[] = [];
  let skippedLines = 0;

  for (const item of rawMessages) {
    if (!isRecord(item)) {
      skippedLines += 1;
      continue;
    }

    const message = item as TelegramMessage;
    const type = message.type ?? "message";

    // Telegram includes service rows (joins, pins, calls) in the same array.
    if (type !== "message") {
      skippedLines += 1;
      continue;
    }

    const timestamp = parseDate(message);
    const text = extractText(message).trim();

    if (timestamp === null || text.length === 0) {
      skippedLines += 1;
      continue;
    }

    messages.push({
      timestamp,
      sender: pickString(message.from, message.actor) ?? "Unknown",
      text,
    });
  }

  if (messages.length === 0) {
    throw new Error(
      "No text messages found in this Telegram export. Media-only messages are skipped.",
    );
  }

  messages.sort((a, b) => a.timestamp - b.timestamp);

  return {
    platform: "telegram",
    messages,
    title: root ? pickString(root.name, root.title) : undefined,
    skippedLines,
  };
}
