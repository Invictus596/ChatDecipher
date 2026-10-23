"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Icon, type IconName } from "@/components/ui/icon";
import { getDb, getChatStatus } from "@/lib/db";
import { formatNumber, pluralize } from "@/lib/utils";

type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tile: string;
  accent: string;
};

export function LibraryStats() {
  const chats = useLiveQuery(() => getDb().parsedChats.toArray(), [], undefined);
  const isLoading = chats === undefined;

  const importCount = chats?.length ?? 0;
  const parsedCount =
    chats?.filter((chat) => getChatStatus(chat) === "parsed").length ?? 0;
  const queuedCount =
    chats?.filter((chat) => getChatStatus(chat) === "queued").length ?? 0;
  const messageCount =
    chats?.reduce((sum, chat) => sum + chat.messageCount, 0) ?? 0;
  const chunkCount =
    chats?.reduce((sum, chat) => sum + chat.rawChunks.length, 0) ?? 0;

  const stats: Stat[] = [
    {
      label: "Saved exports",
      value: isLoading ? "—" : formatNumber(importCount),
      hint:
        importCount === 0
          ? "Nothing imported yet"
          : `${pluralize(chunkCount, "raw chunk")} in IndexedDB`,
      icon: "database",
      tile: "bg-primary-container text-on-primary-container",
      accent: "bg-primary",
    },
    {
      label: "Messages indexed",
      value: isLoading ? "—" : formatNumber(messageCount),
      hint:
        messageCount > 0
          ? `Across ${pluralize(parsedCount, "parsed export")}`
          : queuedCount > 0
            ? `${pluralize(queuedCount, "export")} parsing locally`
            : "Import a chat to count messages",
      icon: "chat",
      tile: "bg-secondary-container text-on-secondary-container",
      accent: "bg-secondary",
    },
    {
      label: "Local AI engine",
      value: "Idle",
      hint: "WebLLM loads in Phase 3",
      icon: "cpu",
      tile: "bg-tertiary-container text-on-tertiary-container",
      accent: "bg-tertiary",
    },
    {
      label: "Data uploaded",
      value: "0 B",
      hint: "And it stays that way",
      icon: "shield",
      tile: "bg-surface-container-highest text-on-surface",
      accent: "bg-outline",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <article
          key={stat.label}
          className="group relative overflow-hidden rounded-[24px] border border-outline-variant/50 bg-surface-container-low/75 p-4 sm:p-5 spring hover:-translate-y-0.5 hover:shadow-[var(--elevation-2)]"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`grid size-9 place-items-center rounded-[12px] ${stat.tile}`}
            >
              <Icon name={stat.icon} className="size-[17px]" />
            </span>
            <span
              className={`mt-1.5 h-1 w-7 rounded-full opacity-70 ${stat.accent}`}
              aria-hidden
            />
          </div>
          <p className="mt-4 font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">
            {stat.value}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-on-surface">
            {stat.label}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant">
            {stat.hint}
          </p>
        </article>
      ))}
    </div>
  );
}
