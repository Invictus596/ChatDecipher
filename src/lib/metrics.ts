import type { NormalizedMessage } from "@/lib/parsers/types";

export interface SenderBreakdown {
  sender: string;
  count: number;
  /** Fraction of all messages, 0–1. */
  share: number;
}

export interface ActivityPoint {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
  timestamp: number;
}

export interface ChatMetrics {
  totalMessages: number;
  activeDays: number;
  uniqueSenders: number;
  averagePerActiveDay: number;
  topContributor: SenderBreakdown | null;
  messagesBySender: SenderBreakdown[];
  /** Continuous local-day series, including zero-message days. */
  daily: ActivityPoint[];
  /** Continuous local-month series, including zero-message months. */
  monthly: ActivityPoint[];
  firstMessageAt: number | null;
  lastMessageAt: number | null;
}

const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const fullDayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const fullMonthLabel = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function emptyMetrics(): ChatMetrics {
  return {
    totalMessages: 0,
    activeDays: 0,
    uniqueSenders: 0,
    averagePerActiveDay: 0,
    topContributor: null,
    messagesBySender: [],
    daily: [],
    monthly: [],
    firstMessageAt: null,
    lastMessageAt: null,
  };
}

export function computeChatMetrics(
  inputMessages: NormalizedMessage[],
): ChatMetrics {
  const messages = inputMessages.filter((message) => {
    if (!Number.isFinite(message.timestamp)) return false;
    return !Number.isNaN(new Date(message.timestamp).getTime());
  });

  if (messages.length === 0) return emptyMetrics();

  const senderCounts = new Map<string, number>();
  const dailyCounts = new Map<string, number>();
  const monthlyCounts = new Map<string, number>();

  let firstMessageAt = messages[0].timestamp;
  let lastMessageAt = messages[0].timestamp;

  for (const message of messages) {
    const sender = message.sender.trim() || "Unknown";
    senderCounts.set(sender, (senderCounts.get(sender) ?? 0) + 1);

    const date = new Date(message.timestamp);
    const day = localDayKey(date);
    const month = localMonthKey(date);
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
    monthlyCounts.set(month, (monthlyCounts.get(month) ?? 0) + 1);

    if (message.timestamp < firstMessageAt) firstMessageAt = message.timestamp;
    if (message.timestamp > lastMessageAt) lastMessageAt = message.timestamp;
  }

  const totalMessages = messages.length;

  const messagesBySender: SenderBreakdown[] = [...senderCounts.entries()]
    .map(([sender, count]) => ({
      sender,
      count,
      share: count / totalMessages,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.sender.localeCompare(b.sender, "en", { sensitivity: "base" }),
    );

  const daily: ActivityPoint[] = [];
  const dayCursor = new Date(firstMessageAt);
  dayCursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(lastMessageAt);
  lastDay.setHours(0, 0, 0, 0);

  while (dayCursor.getTime() <= lastDay.getTime()) {
    const key = localDayKey(dayCursor);
    daily.push({
      key,
      label: dayLabel.format(dayCursor),
      fullLabel: fullDayLabel.format(dayCursor),
      count: dailyCounts.get(key) ?? 0,
      timestamp: dayCursor.getTime(),
    });
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  const monthly: ActivityPoint[] = [];
  const monthCursor = new Date(
    new Date(firstMessageAt).getFullYear(),
    new Date(firstMessageAt).getMonth(),
    1,
  );
  const lastMonth = new Date(
    new Date(lastMessageAt).getFullYear(),
    new Date(lastMessageAt).getMonth(),
    1,
  );

  while (monthCursor.getTime() <= lastMonth.getTime()) {
    const key = localMonthKey(monthCursor);
    monthly.push({
      key,
      label: `${monthLabel.format(monthCursor)} '${String(
        monthCursor.getFullYear(),
      ).slice(-2)}`,
      fullLabel: fullMonthLabel.format(monthCursor),
      count: monthlyCounts.get(key) ?? 0,
      timestamp: monthCursor.getTime(),
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  const activeDays = daily.filter((point) => point.count > 0).length;

  return {
    totalMessages,
    activeDays,
    uniqueSenders: messagesBySender.length,
    averagePerActiveDay:
      activeDays > 0 ? totalMessages / activeDays : 0,
    topContributor: messagesBySender[0] ?? null,
    messagesBySender,
    daily,
    monthly,
    firstMessageAt,
    lastMessageAt,
  };
}
