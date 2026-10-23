import type { ChatPlatform } from "@/lib/db";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per export

export const UPLOAD_ACCEPT = ".txt,.json,text/plain,application/json";

export type FileValidation =
  | { ok: true; platform: ChatPlatform; extension: ".txt" | ".json" }
  | { ok: false; reason: string };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * Intake rules for Phase 1. The actual content parsing (date/sender/body)
 * lands in Phase 2; this only decides whether a file is a supported export.
 */
export function validateChatFile(file: File): FileValidation {
  const extension = extensionOf(file.name);

  if (extension !== ".txt" && extension !== ".json") {
    return {
      ok: false,
      reason: "Unsupported format — use a WhatsApp .txt or Telegram .json export.",
    };
  }

  if (file.size === 0) {
    return { ok: false, reason: "This file is empty." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `Too large — keep exports under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    };
  }

  return {
    ok: true,
    extension,
    platform: extension === ".json" ? "telegram" : "whatsapp",
  };
}

/** "Chat with Sam (1).txt" -> "Chat with Sam" */
export function contactNameFromFile(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .replace(/[_]+/g, " ")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : "Untitled chat";
}

export const PLATFORM_LABELS: Record<ChatPlatform, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  unknown: "Unknown",
};
