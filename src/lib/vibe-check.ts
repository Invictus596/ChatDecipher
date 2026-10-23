import type { NormalizedMessage } from "@/lib/parsers/types";

/**
 * The system prompt is intentionally fixed: the local model is a small
 * instruction-tuned model, so a clear, single-purpose brief works best.
 */
export const VIBE_CHECK_SYSTEM_PROMPT =
  "You are an analytical assistant. Analyze this chat log and provide a 'Vibe Check'. Summarize the overall tone, the main topics discussed, and the communication dynamic between the senders. Keep it concise, engaging, and output valid Markdown.";

export const VIBE_CHECK_MAX_MESSAGES = 300;
export const VIBE_CHECK_MAX_CHARS = 8_000;
const MAX_MESSAGE_CHARS = 500;

const MEDIA_PLACEHOLDER =
  /^(?:<)?\s*(?:media|image|video|audio|sticker|gif|document|contact card|location)\s+omitted\s*(?:>)?$/i;

export type VibeCheckMessage = {
  role: "system" | "user";
  content: string;
};

export interface VibeCheckSample {
  /** Formatted, chronological chat sample sent to the local model. */
  text: string;
  sampledMessages: number;
  totalMessages: number;
  omittedMessages: number;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
}

function isUsefulMessage(message: NormalizedMessage): boolean {
  const text = message.text.trim();
  if (text.length === 0) return false;
  if (MEDIA_PLACEHOLDER.test(text)) return false;
  if (/^this message was deleted$/i.test(text)) return false;
  return true;
}

function compactText(text: string): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= MAX_MESSAGE_CHARS) return singleLine;
  return `${singleLine.slice(0, MAX_MESSAGE_CHARS - 1)}…`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Builds a representative, context-window-safe slice of a chat.
 *
 * Media placeholders and deleted-message stubs are dropped, the most recent
 * 300 useful messages are considered, and the oldest lines are trimmed until
 * the formatted sample fits the character budget. The sample is chronological
 * so the model sees the conversation in the order it happened.
 */
export function buildVibeCheckSample(
  messages: NormalizedMessage[],
  chatName: string,
): VibeCheckSample {
  const useful = messages.filter(isUsefulMessage);
  const recent = useful.slice(-VIBE_CHECK_MAX_MESSAGES);
  const lines = recent.map(
    (message) =>
      `[${formatTimestamp(message.timestamp)}] ${message.sender}: ${compactText(
        message.text,
      )}`,
  );

  const selected: string[] = [];
  let characterCount = 0;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    const nextCount = characterCount + line.length + 1;

    if (nextCount > VIBE_CHECK_MAX_CHARS) break;

    selected.unshift(line);
    characterCount = nextCount;
  }

  const first = selected.length > 0 ? recent[recent.length - selected.length] : null;
  const last = selected.length > 0 ? recent[recent.length - 1] : null;

  const header = [
    `Chat: ${chatName}`,
    `Sample: ${selected.length} of ${messages.length} messages`,
    first && last
      ? `Range: ${formatTimestamp(first.timestamp)} – ${formatTimestamp(
          last.timestamp,
        )}`
      : "Range: none",
    "---",
  ].join("\n");

  return {
    text: selected.length > 0 ? `${header}\n${selected.join("\n")}` : "",
    sampledMessages: selected.length,
    totalMessages: messages.length,
    omittedMessages: Math.max(0, messages.length - selected.length),
    firstTimestamp: first?.timestamp ?? null,
    lastTimestamp: last?.timestamp ?? null,
  };
}

export function buildVibeCheckMessages(
  sample: VibeCheckSample,
): VibeCheckMessage[] {
  return [
    { role: "system", content: VIBE_CHECK_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "Here is a representative sample of the conversation:",
        "",
        sample.text,
        "",
        "Write the Vibe Check now. Use short Markdown sections for **Tone**, **Main topics**, and **Communication dynamic**. Keep it under 220 words, and do not invent facts that are not in the sample.",
      ].join("\n"),
    },
  ];
}
