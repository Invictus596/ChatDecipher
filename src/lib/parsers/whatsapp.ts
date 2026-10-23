import type {
  ChatParseResult,
  DateOrder,
  NormalizedMessage,
} from "@/lib/parsers/types";

/**
 * WhatsApp exports two common shapes:
 *
 *   [12/03/24, 9:41:05 PM] Alice: message
 *   12/03/24, 21:41 - Alice: message
 *
 * Locale decides whether the first number is the day or the month. We look for
 * unambiguous dates in the file (a value above 12) and fall back to day-first,
 * which covers most WhatsApp locales. Ambiguous files cannot be resolved with
 * certainty without asking the user.
 */
const LINE_PATTERN =
  /^\[?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)\]?\s*(?:[-–—]\s*)?(.+?):\s(.*)$/i;

const DATE_PREFIX =
  /^\[?\d{1,2}[./-]\d{1,2}[./-]\d{2,4}[,\s]+\d{1,2}:\d{2}/;

const DATE_VOTE = /^(?:\[)?(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/gm;

const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?$/;

function normalizeExportText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    // WhatsApp inserts directional marks and narrow no-break spaces around
    // timestamps and in RTL chats. They are invisible but break naive regexes.
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/[\u202f\u00a0]/g, " ");
}

function detectDateOrder(text: string): DateOrder {
  let dayFirstVotes = 0;
  let monthFirstVotes = 0;

  for (const match of text.matchAll(DATE_VOTE)) {
    const first = Number(match[1]);
    const second = Number(match[2]);

    if (first > 12 && second <= 12) dayFirstVotes += 1;
    if (second > 12 && first <= 12) monthFirstVotes += 1;
  }

  return monthFirstVotes > dayFirstVotes ? "month-first" : "day-first";
}

function parseTime(token: string): [number, number, number] | null {
  const match = token
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .match(TIME_PATTERN);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const meridiem = match[4];

  if (minutes > 59 || seconds > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
    if (meridiem === "pm") hours += 12;
  }

  if (hours > 23) return null;
  return [hours, minutes, seconds];
}

function parseTimestamp(
  dateToken: string,
  timeToken: string,
  fallbackOrder: DateOrder,
): number | null {
  const parts = dateToken.split(/[./-]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [first, second, third] = parts;
  let year: number;
  let month: number;
  let day: number;

  if (first > 99) {
    // ISO-like year-first date (not emitted by WhatsApp today, but harmless).
    [year, month, day] = [first, second, third];
  } else {
    let order = fallbackOrder;
    if (first > 12 && second <= 12) order = "day-first";
    else if (second > 12 && first <= 12) order = "month-first";

    if (order === "month-first") {
      [month, day, year] = [first, second, third];
    } else {
      [day, month, year] = [first, second, third];
    }
  }

  if (year < 100) year += 2000;
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const time = parseTime(timeToken);
  if (!time) return null;

  const [hours, minutes, seconds] = time;
  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  // Reject impossible dates such as 31/02 that JavaScript would roll over.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

export function parseWhatsAppExport(raw: string): ChatParseResult {
  const text = normalizeExportText(raw);

  if (!text.trim()) {
    throw new Error("This WhatsApp export is empty.");
  }

  const dateOrder = detectDateOrder(text);
  const messages: NormalizedMessage[] = [];
  let skippedLines = 0;
  let current: NormalizedMessage | null = null;

  for (const line of text.split("\n")) {
    const lineWithoutTrailingSpace = line.replace(/\s+$/, "");
    const match = LINE_PATTERN.exec(lineWithoutTrailingSpace);

    if (match) {
      const timestamp = parseTimestamp(match[1], match[2], dateOrder);

      if (timestamp === null) {
        skippedLines += 1;
        current = null;
        continue;
      }

      const message: NormalizedMessage = {
        timestamp,
        sender: match[3].trim() || "Unknown",
        text: match[4],
      };

      messages.push(message);
      current = message;
      continue;
    }

    if (DATE_PREFIX.test(lineWithoutTrailingSpace)) {
      // A timestamped system notice (encryption banner, group changes) is not
      // part of the previous message body.
      skippedLines += 1;
      current = null;
      continue;
    }

    if (current) {
      current.text = current.text ? `${current.text}\n${line}` : line;
    } else if (lineWithoutTrailingSpace.length > 0) {
      skippedLines += 1;
    }
  }

  for (const message of messages) {
    message.text = message.text.replace(/\s+$/, "");
  }

  if (messages.length === 0) {
    throw new Error(
      "No WhatsApp messages found. Export the chat as .txt without media and check that the date format is supported.",
    );
  }

  return {
    platform: "whatsapp",
    messages,
    skippedLines,
    dateOrder,
  };
}
