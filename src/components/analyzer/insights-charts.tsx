"use client";

import { useId, useMemo, useState } from "react";
import { Activity, ChartColumn } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import type { ChatMetrics, SenderBreakdown } from "@/lib/metrics";
import { formatNumber, pluralize } from "@/lib/utils";

type Palette = {
  primary: string;
  series: string[];
  text: string;
  grid: string;
  surface: string;
  border: string;
  tooltip: string;
};

const lightPalette: Palette = {
  primary: "#5b4bc4",
  series: [
    "#5b4bc4",
    "#00696d",
    "#a63d1f",
    "#6d5a00",
    "#8b3f8f",
    "#3f6212",
    "#0e7490",
    "#9a3412",
  ],
  text: "#47464f",
  grid: "#c9c5d1",
  surface: "#ffffff",
  border: "#c9c5d1",
  tooltip: "#1b1b22",
};

const darkPalette: Palette = {
  primary: "#c9beff",
  series: [
    "#c9beff",
    "#80d4d7",
    "#ffb59b",
    "#e7c44a",
    "#e3a6e8",
    "#b5d98a",
    "#7dd3fc",
    "#fdba74",
  ],
  text: "#c9c5d1",
  grid: "#474550",
  surface: "#292730",
  border: "#474550",
  tooltip: "#e6e1eb",
};

function useChartPalette(): Palette {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? darkPalette : lightPalette;
}

function tooltipStyle(palette: Palette) {
  return {
    backgroundColor: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: 14,
    padding: "10px 12px",
    boxShadow: "var(--elevation-2)",
    color: palette.tooltip,
    fontSize: 12,
  } satisfies React.CSSProperties;
}

function ChartCardHeader({
  icon,
  eyebrow,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-surface-container-high text-primary">
          {icon}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            {eyebrow}
          </p>
          <h4 className="mt-0.5 font-display text-base font-semibold tracking-[-0.01em]">
            {title}
          </h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant">
            {detail}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="mt-4 grid h-[240px] place-items-center rounded-[20px] border border-dashed border-outline-variant/60 bg-surface-container-lowest/35 px-6 text-center">
      <p className="max-w-xs text-xs leading-relaxed text-on-surface-variant">
        {message}
      </p>
    </div>
  );
}

export function SenderChart({ senders }: { senders: SenderBreakdown[] }) {
  const palette = useChartPalette();
  const maxRows = 6;
  const rows = useMemo(() => {
    if (senders.length <= maxRows) return senders;

    const visible = senders.slice(0, maxRows - 1);
    const remaining = senders.slice(maxRows - 1);
    const count = remaining.reduce((sum, sender) => sum + sender.count, 0);
    const total = senders.reduce((sum, sender) => sum + sender.count, 0);

    return [
      ...visible,
      {
        sender: `Others (${remaining.length})`,
        count,
        share: total > 0 ? count / total : 0,
      },
    ];
  }, [senders]);

  const height = Math.max(230, rows.length * 44 + 42);

  return (
    <section className="rounded-[26px] border border-outline-variant/50 bg-surface-container-lowest/55 p-4 sm:p-5">
      <ChartCardHeader
        icon={<ChartColumn className="size-[18px]" />}
        eyebrow="Who is talking"
        title="Messages per sender"
        detail={
          senders.length > 0
            ? `${pluralize(senders.length, "sender")} · ${
                rows.length < senders.length
                  ? `top ${rows.length - 1} + others`
                  : "all shown"
              }`
            : "No sender data yet"
        }
      />

      {rows.length === 0 ? (
        <ChartEmpty message="Send a few messages and the sender breakdown appears here." />
      ) : (
        <>
          <div
            className="mt-4 w-full"
            style={{ height }}
            role="img"
            aria-label={`Bar chart of messages per sender. ${rows
              .map((row) => `${row.sender}: ${row.count}`)
              .join(". ")}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 38, bottom: 4, left: 0 }}
                barCategoryGap="26%"
              >
                <CartesianGrid
                  horizontal={false}
                  stroke={palette.grid}
                  strokeOpacity={0.45}
                  strokeDasharray="4 7"
                />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="sender"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: palette.text, fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(value: string) =>
                    value.length > 15 ? `${value.slice(0, 14)}…` : value
                  }
                />
                <Tooltip
                  cursor={{ fill: palette.primary, fillOpacity: 0.08 }}
                  contentStyle={tooltipStyle(palette)}
                  labelStyle={{ color: palette.tooltip, fontWeight: 700 }}
                  itemStyle={{ color: palette.tooltip }}
                  separator=": "
                />
                <Bar
                  dataKey="count"
                  name="Messages"
                  barSize={18}
                  radius={[0, 9, 9, 0]}
                  isAnimationActive={rows.length <= 20}
                >
                  {rows.map((row, index) => (
                    <Cell
                      key={row.sender}
                      fill={palette.series[index % palette.series.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    fill={palette.text}
                    fontSize={10}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {rows.map((row, index) => (
              <span
                key={row.sender}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-on-surface-variant"
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor:
                      palette.series[index % palette.series.length],
                  }}
                  aria-hidden
                />
                <span className="max-w-[150px] truncate">{row.sender}</span>
                <span className="text-on-surface-variant/70">
                  {Math.round(row.share * 100)}%
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

type Granularity = "daily" | "monthly";

export function ActivityChart({ metrics }: { metrics: ChatMetrics }) {
  const palette = useChartPalette();
  const gradientId = useId().replace(/:/g, "");
  const [granularity, setGranularity] = useState<Granularity>(
    metrics.daily.length > 120 ? "monthly" : "daily",
  );

  const data = granularity === "daily" ? metrics.daily : metrics.monthly;
  const busiest = useMemo(
    () =>
      data.reduce(
        (best, point) => (point.count > best.count ? point : best),
        data[0] ?? { count: 0, fullLabel: "" },
      ),
    [data],
  );

  return (
    <section className="rounded-[26px] border border-outline-variant/50 bg-surface-container-lowest/55 p-4 sm:p-5">
      <ChartCardHeader
        icon={<Activity className="size-[18px]" />}
        eyebrow="When it happens"
        title="Chat activity over time"
        detail={
          busiest.count > 0
            ? `Busiest ${granularity === "daily" ? "day" : "month"}: ${
                busiest.fullLabel
              } · ${formatNumber(busiest.count)} messages`
            : "No activity in this range"
        }
        action={
          <div
            className="flex rounded-full border border-outline-variant/60 bg-surface-container-lowest/70 p-0.5"
            role="group"
            aria-label="Activity granularity"
          >
            {(
              [
                ["daily", "Days"],
                ["monthly", "Months"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGranularity(value)}
                aria-pressed={granularity === value}
                className={
                  granularity === value
                    ? "rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-on-primary"
                    : "rounded-full px-3 py-1.5 text-[10px] font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                }
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {data.length === 0 ? (
        <ChartEmpty message="Import a conversation to see its rhythm over time." />
      ) : (
        <div
          className="mt-4 h-[280px] w-full"
          role="img"
          aria-label={`Area chart of messages per ${
            granularity === "daily" ? "day" : "month"
          }, from ${data[0]?.label ?? "start"} to ${
            data[data.length - 1]?.label ?? "end"
          }.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={palette.primary}
                    stopOpacity={0.34}
                  />
                  <stop
                    offset="100%"
                    stopColor={palette.primary}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke={palette.grid}
                strokeOpacity={0.45}
                strokeDasharray="4 7"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                tick={{ fill: palette.text, fontSize: 10 }}
              />
              <YAxis
                width={42}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: palette.text, fontSize: 10 }}
              />
              <Tooltip
                cursor={{
                  stroke: palette.primary,
                  strokeOpacity: 0.35,
                  strokeWidth: 1,
                }}
                contentStyle={tooltipStyle(palette)}
                labelStyle={{ color: palette.tooltip, fontWeight: 700 }}
                itemStyle={{ color: palette.tooltip }}
                separator=": "
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Messages"
                stroke={palette.primary}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={data.length <= 120}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
