"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  Crown,
  Gauge,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import { ActivityChart, SenderChart } from "@/components/analyzer/insights-charts";
import { ModelLoader } from "@/components/model-loader";
import { Icon, Spinner } from "@/components/ui/icon";
import { PLATFORM_LABELS } from "@/lib/chat-files";
import {
  getChatStatus,
  getDb,
  type ParsedChat,
} from "@/lib/db";
import type { ChatMetrics } from "@/lib/metrics";
import { processChat } from "@/lib/process-chat";
import { cardSurface, eyebrow } from "@/lib/styles";
import { cn, formatNumber, pluralize } from "@/lib/utils";

type ChatWithMetrics = ParsedChat & { metrics: ChatMetrics };

type QueueItem = { id: string; name: string };

type ParseJob = {
  done: number;
  total: number;
  current: string;
};

const fullNumber = new Intl.NumberFormat("en-US");

const joinedDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function hasMetrics(chat: ParsedChat): chat is ChatWithMetrics {
  return getChatStatus(chat) === "parsed" && chat.metrics !== undefined;
}

function formatRange(metrics: ChatMetrics): string {
  if (metrics.firstMessageAt === null || metrics.lastMessageAt === null) {
    return "No messages";
  }

  const start = joinedDate.format(metrics.firstMessageAt);
  const end = joinedDate.format(metrics.lastMessageAt);
  return start === end ? start : `${start} – ${end}`;
}

export function AnalyzerDashboard() {
  const chats = useLiveQuery(
    () => getDb().parsedChats.orderBy("timestamp").reverse().toArray(),
    [],
    undefined,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [job, setJob] = useState<ParseJob | null>(null);
  const [reparsing, setReparsing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [chartsMounted, setChartsMounted] = useState(false);

  const queueRef = useRef<QueueItem[]>([]);
  const pendingRef = useRef(new Set<string>());
  const drainingRef = useRef(false);
  const completedRef = useRef(0);
  const totalRef = useRef(0);
  const mountedRef = useRef(true);

  const parsedChats = useMemo(
    () => (chats ?? []).filter(hasMetrics),
    [chats],
  );

  const selected =
    parsedChats.find((chat) => chat.id === selectedId) ??
    parsedChats[0] ??
    null;

  const queuedCount =
    chats?.filter((chat) => getChatStatus(chat) === "queued").length ?? 0;
  const failedCount =
    chats?.filter((chat) => getChatStatus(chat) === "error").length ?? 0;

  useEffect(() => {
    setChartsMounted(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;

    drainingRef.current = true;
    if (mountedRef.current && queueRef.current.length > 0) {
      setJob({
        done: completedRef.current,
        total: totalRef.current,
        current: queueRef.current[0].name,
      });
    }

    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];

        if (mountedRef.current) {
          setJob({
            done: completedRef.current,
            total: totalRef.current,
            current: item.name,
          });
        }

        try {
          await processChat(item.id);
        } catch {
          // processChat persists its own error state. A storage failure is rare;
          // leave the record queued so it can be retried after a reload.
        }

        queueRef.current.shift();
        pendingRef.current.delete(item.id);
        completedRef.current += 1;
      }
    } finally {
      drainingRef.current = false;
      if (mountedRef.current) {
        setJob(null);
        completedRef.current = 0;
        totalRef.current = 0;
      }
    }
  }, []);

  useEffect(() => {
    if (!chats) return;

    let added = false;

    for (const chat of chats) {
      if (
        getChatStatus(chat) === "queued" &&
        !pendingRef.current.has(chat.id)
      ) {
        pendingRef.current.add(chat.id);
        queueRef.current.push({ id: chat.id, name: chat.contactName });
        totalRef.current += 1;
        added = true;
      }
    }

    if (added) void drainQueue();
  }, [chats, drainQueue]);

  async function reparseSelected() {
    if (!selected) return;

    setReparsing(true);
    setActionMessage(null);

    try {
      const status = await processChat(selected.id, { force: true });
      if (status === "error") {
        setActionMessage(
          "That export could not be parsed. Check the library below for the reason.",
        );
      }
    } finally {
      setReparsing(false);
    }
  }

  const metrics = selected?.metrics ?? null;

  const stats = useMemo(() => {
    if (!metrics) return [];

    const top = metrics.topContributor;

    return [
      {
        label: "Total messages",
        value: fullNumber.format(metrics.totalMessages),
        hint: `${pluralize(metrics.uniqueSenders, "sender")} · ${formatRange(
          metrics,
        )}`,
        icon: MessagesSquare,
        tile: "bg-primary-container text-on-primary-container",
      },
      {
        label: "Active days",
        value: fullNumber.format(metrics.activeDays),
        hint: `${metrics.averagePerActiveDay.toFixed(
          1,
        )} messages per active day`,
        icon: CalendarDays,
        tile: "bg-secondary-container text-on-secondary-container",
      },
      {
        label: "Top contributor",
        value: top?.sender ?? "—",
        hint: top
          ? `${fullNumber.format(top.count)} messages · ${Math.round(
              top.share * 100,
            )}%`
          : "No messages yet",
        icon: Crown,
        tile: "bg-tertiary-container text-on-tertiary-container",
      },
      {
        label: "Avg / active day",
        value: metrics.averagePerActiveDay.toFixed(1),
        hint:
          metrics.activeDays > 0
            ? `Across ${pluralize(metrics.activeDays, "active day")}`
            : "No active days yet",
        icon: Gauge,
        tile: "bg-surface-container-highest text-on-surface",
      },
    ];
  }, [metrics]);

  return (
    <section aria-labelledby="insights-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrow}>Phase 2 · Metrics</p>
          <h3
            id="insights-heading"
            className="mt-1 font-display text-2xl font-semibold tracking-[-0.025em]"
          >
            Conversation insights
          </h3>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-on-surface-variant sm:text-sm">
            Counts, senders, and rhythm — computed from the raw export in this
            tab. The Vibe Check below adds optional local AI, still on-device.
          </p>
        </div>

        {job ? (
          <div
            role="status"
            aria-live="polite"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary-container/45 px-3.5 py-2 text-[11px] font-semibold text-on-primary-container"
          >
            <Spinner className="size-3.5" />
            <span className="truncate">
              Parsing {job.current || "export"} ·{" "}
              {Math.min(job.done + 1, job.total)}/{job.total}
            </span>
          </div>
        ) : null}
      </div>

      {actionMessage ? (
        <p
          role="status"
          className="rounded-[18px] border border-error/30 bg-error-container/30 px-4 py-3 text-xs font-semibold text-on-error-container"
        >
          {actionMessage}
        </p>
      ) : null}

      {!selected || !metrics ? (
        <div
          className={cn(
            cardSurface,
            "relative overflow-hidden px-6 py-10 text-center sm:px-10",
          )}
        >
          <div
            className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-md">
            {queuedCount > 0 || job ? (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-primary-container text-on-primary-container">
                  <Spinner className="size-6" />
                </span>
                <h4 className="mt-4 font-display text-lg font-semibold">
                  Reading your export
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                  {queuedCount > 0
                    ? `${pluralize(
                        queuedCount,
                        "queued export",
                      )} will be parsed locally. Large files can take a moment.`
                    : "Finishing on-device parsing…"}
                </p>
              </>
            ) : failedCount > 0 ? (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-error-container text-on-error-container">
                  <Icon name="alert" className="size-6" />
                </span>
                <h4 className="mt-4 font-display text-lg font-semibold">
                  No readable messages yet
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                  {pluralize(failedCount, "export")} couldn’t be parsed. Check
                  the reason in the local library below, then retry or re-export
                  the chat.
                </p>
              </>
            ) : (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-surface-container-high text-primary">
                  <WandSparkles className="size-6" />
                </span>
                <h4 className="mt-4 font-display text-lg font-semibold">
                  Your charts are waiting
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                  Import a WhatsApp <strong>.txt</strong> or Telegram{" "}
                  <strong>.json</strong> export above. Parsing starts
                  automatically, entirely in this browser.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-[32px] border border-outline-variant/60 bg-surface-container-low/70 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary-container/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-on-secondary-container">
                  <ShieldCheck className="size-3.5" />
                  Parsed locally
                </span>
                <span className="rounded-full border border-outline-variant/50 bg-surface-container-lowest/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                  {PLATFORM_LABELS[selected.platform]}
                </span>
              </div>

              <h4 className="mt-2.5 truncate font-display text-[26px] font-semibold leading-tight tracking-[-0.03em]">
                {selected.contactName}
              </h4>
              <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                {formatRange(metrics)} ·{" "}
                {pluralize(metrics.totalMessages, "message")} ·{" "}
                {pluralize(metrics.uniqueSenders, "sender")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void reparseSelected()}
              disabled={reparsing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest/60 px-4 py-2.5 text-xs font-semibold text-on-surface transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:border-primary/45 hover:bg-surface-container-high active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              {reparsing ? (
                <Spinner className="size-3.5" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {reparsing ? "Reparsing…" : "Reparse"}
            </button>
          </div>

          {parsedChats.length > 1 ? (
            <div
              role="tablist"
              aria-label="Parsed chats"
              className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {parsedChats.map((chat) => {
                const active = chat.id === selected.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedId(chat.id);
                      setActionMessage(null);
                    }}
                    className={cn(
                      "flex max-w-[220px] shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-left text-[11px] font-semibold transition-colors duration-200",
                      active
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest/55 text-on-surface-variant hover:border-primary/40 hover:text-on-surface",
                    )}
                  >
                    <span className="truncate">{chat.contactName}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        active
                          ? "bg-on-primary/15 text-on-primary"
                          : "bg-surface-container-high text-on-surface-variant",
                      )}
                    >
                      {formatNumber(chat.messageCount)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <article
                  key={stat.label}
                  className="group relative overflow-hidden rounded-[22px] border border-outline-variant/50 bg-surface-container-lowest/55 p-4 spring hover:-translate-y-0.5 hover:shadow-[var(--elevation-1)]"
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-[11px]",
                      stat.tile,
                    )}
                  >
                    <StatIcon className="size-4" />
                  </span>
                  <p
                    className="mt-3.5 truncate font-display text-[24px] font-semibold leading-none tracking-[-0.02em]"
                    title={stat.value}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-on-surface">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-on-surface-variant">
                    {stat.hint}
                  </p>
                </article>
              );
            })}
          </div>

          {chartsMounted ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SenderChart senders={metrics.messagesBySender} />
              <ActivityChart key={selected.id} metrics={metrics} />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2" aria-busy="true">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="h-[330px] animate-pulse rounded-[26px] border border-outline-variant/40 bg-surface-container-lowest/40"
                />
              ))}
            </div>
          )}
          </div>
          <ModelLoader chat={selected} />
        </>
      )}
    </section>
  );
}
