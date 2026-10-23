"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Icon, Spinner } from "@/components/ui/icon";
import {
  getDb,
  getChatStatus,
  type ChatPlatform,
  type ChatStatus,
  type ParsedChat,
} from "@/lib/db";
import { PLATFORM_LABELS } from "@/lib/chat-files";
import { btnGhost, btnOutline } from "@/lib/styles";
import { cn, formatRelativeTime, pluralize } from "@/lib/utils";

const platformStyles: Record<
  ChatPlatform,
  { tile: string; icon: "chat" | "braces" | "fileText" }
> = {
  whatsapp: {
    tile: "bg-secondary-container text-on-secondary-container",
    icon: "chat",
  },
  telegram: {
    tile: "bg-primary-container text-on-primary-container",
    icon: "braces",
  },
  unknown: {
    tile: "bg-tertiary-container text-on-tertiary-container",
    icon: "fileText",
  },
};

const statusStyles: Record<
  ChatStatus,
  { label: string; badge: string; dot: string; detail: string }
> = {
  parsed: {
    label: "Parsed",
    badge: "bg-secondary-container/60 text-on-secondary-container",
    dot: "bg-secondary",
    detail: "parsed on-device",
  },
  queued: {
    label: "Queued",
    badge: "bg-tertiary-container/60 text-on-tertiary-container",
    dot: "bg-tertiary",
    detail: "queued for parsing",
  },
  error: {
    label: "Error",
    badge: "bg-error-container/60 text-on-error-container",
    dot: "bg-error",
    detail: "couldn’t parse",
  },
};

type ChatLibraryProps = {
  limit?: number;
  showClear?: boolean;
  showEmptyLink?: boolean;
  className?: string;
};

export function ChatLibrary({
  limit,
  showClear = false,
  showEmptyLink = true,
  className,
}: ChatLibraryProps) {
  const chats = useLiveQuery(
    () => getDb().parsedChats.orderBy("timestamp").reverse().toArray(),
    [],
    undefined,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const visibleChats = useMemo(
    () => (limit ? chats?.slice(0, limit) : chats) ?? [],
    [chats, limit],
  );

  const isLoading = chats === undefined;
  const total = chats?.length ?? 0;

  async function removeChat(chat: ParsedChat) {
    setDeletingId(chat.id);
    try {
      await getDb().parsedChats.delete(chat.id);
    } finally {
      setDeletingId(null);
    }
  }

  async function retryChat(chat: ParsedChat) {
    setRetryingId(chat.id);
    try {
      await getDb().parsedChats.update(chat.id, {
        status: "queued",
        parseError: undefined,
      });
    } finally {
      setRetryingId(null);
    }
  }

  async function clearAll() {
    setIsClearing(true);
    try {
      await getDb().parsedChats.clear();
      setConfirmingClear(false);
    } finally {
      setIsClearing(false);
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2.5", className)} aria-busy="true">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3 rounded-[20px] border border-outline-variant/40 bg-surface-container-lowest/40 p-3.5"
          >
            <div className="size-10 animate-pulse rounded-[14px] bg-surface-container-highest" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-container-highest" />
              <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-surface-container-high" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div
        className={cn(
          "rounded-[24px] border border-dashed border-outline-variant/80 bg-surface-container-lowest/40 px-6 py-10 text-center",
          className,
        )}
      >
        <span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-surface-container-high text-on-surface-variant">
          <Icon name="database" className="size-6" />
        </span>
        <p className="mt-4 font-display text-base font-semibold">
          Your local library is empty
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-on-surface-variant">
          Imports are stored in IndexedDB so they survive refreshes — and never
          touch a server.
        </p>
        {showEmptyLink ? (
          <Link href="/analyzer" className={cn(btnOutline, "mt-5")}>
            <Icon name="upload" className="size-4" />
            Import an export
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <ul className="space-y-2.5">
        {visibleChats.map((chat) => {
          const meta = platformStyles[chat.platform];
          const status = getChatStatus(chat);
          const statusStyle = statusStyles[status];
          const isDeleting = deletingId === chat.id;
          const isRetrying = retryingId === chat.id;
          const isBusy = isDeleting || isRetrying;

          return (
            <li
              key={chat.id}
              className={cn(
                "group flex items-center gap-3 rounded-[20px] border border-outline-variant/45 bg-surface-container-lowest/65 p-3.5",
                "transition-[opacity,transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:bg-surface-container-lowest hover:shadow-[var(--elevation-1)]",
                isBusy && "pointer-events-none scale-[0.99] opacity-50",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-[14px]",
                  meta.tile,
                )}
              >
                <Icon name={meta.icon} className="size-[18px]" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {chat.contactName}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                  {PLATFORM_LABELS[chat.platform]} ·{" "}
                  {formatRelativeTime(chat.timestamp)} ·{" "}
                  {status === "parsed"
                    ? `${pluralize(chat.messageCount, "message")} ${
                        statusStyle.detail
                      }`
                    : status === "error"
                      ? (chat.parseError ?? statusStyle.detail)
                      : `${pluralize(chat.rawChunks.length, "chunk")} ${
                          statusStyle.detail
                        }`}
                </p>
              </div>

              <span
                className={cn(
                  "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] md:inline-flex",
                  statusStyle.badge,
                )}
              >
                <span
                  className={cn("size-1.5 rounded-full", statusStyle.dot)}
                  aria-hidden
                />
                {statusStyle.label}
              </span>

              {status === "error" ? (
                <button
                  type="button"
                  onClick={() => void retryChat(chat)}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors duration-200 hover:bg-primary-container hover:text-on-primary-container"
                  aria-label={`Retry parsing ${chat.contactName}`}
                  disabled={isBusy}
                >
                  {isRetrying ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Icon name="refresh" className="size-[17px]" />
                  )}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void removeChat(chat)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors duration-200 hover:bg-error-container hover:text-on-error-container sm:opacity-60 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                aria-label={`Delete ${chat.contactName}`}
                disabled={isBusy}
              >
                {isDeleting ? (
                  <Spinner className="size-4" />
                ) : (
                  <Icon name="trash" className="size-[17px]" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {showClear ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-outline-variant/40 bg-surface-container-low/60 px-4 py-3">
          {confirmingClear ? (
            <>
              <p className="text-xs font-semibold text-on-surface">
                Remove all {pluralize(total, "export")} from this browser?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
                  disabled={isClearing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void clearAll()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-error px-3 py-1.5 text-xs font-semibold text-on-error"
                  disabled={isClearing}
                >
                  {isClearing ? <Spinner className="size-3.5" /> : null}
                  Remove all
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-on-surface-variant">
                {pluralize(total, "export")} ·{" "}
                {pluralize(
                  chats.reduce((sum, chat) => sum + chat.rawChunks.length, 0),
                  "raw chunk",
                )}{" "}
                stored locally
              </p>
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className={cn(btnGhost, "px-3 py-1.5 text-xs text-error hover:bg-error-container hover:text-on-error-container")}
              >
                Clear library
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
