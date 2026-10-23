export type ParsePlatform = "whatsapp" | "telegram";

export type DateOrder = "day-first" | "month-first";

/** One message after platform-specific normalization. */
export interface NormalizedMessage {
  /** Epoch milliseconds. */
  timestamp: number;
  sender: string;
  text: string;
}

export interface ChatParseResult {
  platform: ParsePlatform;
  messages: NormalizedMessage[];
  /** Telegram exports carry the chat title; WhatsApp exports do not. */
  title?: string;
  /** Lines that were not messages (system notices, malformed rows, media). */
  skippedLines: number;
  /** Resolved date order for WhatsApp exports, when relevant. */
  dateOrder?: DateOrder;
}
