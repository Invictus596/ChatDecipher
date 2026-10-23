"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTheme } from "@/components/theme-provider";
import { Icon, Spinner, type IconName } from "@/components/ui/icon";
import {
  clearChatLibrary,
  getDb,
  resetLocalData,
  type ThemePreference,
} from "@/lib/db";
import { btnGhost, btnOutline, cardSurface, eyebrow } from "@/lib/styles";
import { cn, pluralize } from "@/lib/utils";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  copy: string;
  icon: IconName;
}> = [
  { value: "light", label: "Light", copy: "Bright tonal surfaces", icon: "sun" },
  { value: "dark", label: "Dark", copy: "Low-light friendly", icon: "moon" },
  {
    value: "system",
    label: "System",
    copy: "Follows your device",
    icon: "monitor",
  },
];

export function AppearanceSettings() {
  const { theme, setTheme, isReady } = useTheme();

  return (
    <section className={cn(cardSurface, "p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={eyebrow}>Appearance</p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em]">
            Theme
          </h3>
        </div>
        <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant">
          Saved locally
        </span>
      </div>

      <div
        className="mt-4 grid gap-2.5 sm:grid-cols-3"
        role="group"
        aria-label="Theme preference"
      >
        {themeOptions.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              disabled={!isReady}
              className={cn(
                "group relative flex items-center gap-3 rounded-[20px] border p-3.5 text-left",
                "transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] disabled:opacity-60",
                active
                  ? "border-primary/40 bg-primary-container/55 shadow-[var(--elevation-1)]"
                  : "border-outline-variant/60 bg-surface-container-lowest/50 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface-container-high/60",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-[12px] transition-colors",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant",
                )}
              >
                <Icon name={option.icon} className="size-[17px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-on-surface">
                  {option.label}
                </span>
                <span className="block truncate text-[10px] text-on-surface-variant">
                  {option.copy}
                </span>
              </span>
              {active ? (
                <Icon
                  name="check"
                  className="ml-auto size-4 shrink-0 text-primary"
                  strokeWidth={2.6}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-on-surface-variant">
        The preference is stored in IndexedDB and mirrored to localStorage only
        so the correct theme paints before the database opens.
      </p>
    </section>
  );
}

export function PlanSettings() {
  const preferences = useLiveQuery(
    () => getDb().userPreferences.get("app"),
    [],
    undefined,
  );
  const isPremium = preferences?.premiumStatus ?? false;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-primary-container/35 p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-primary/15 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-primary-container/75">
            Plan
          </p>
          <span className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-on-primary">
            {isPremium ? "Pro" : "Free"}
          </span>
        </div>

        <h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-on-primary-container">
          {isPremium ? "Pro unlocked" : "Free, forever"}
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-on-primary-container/80">
          Local imports, on-device analysis, and WebLLM replies stay free. Pro
          adds optional cloud generation and deep analytics.
        </p>

        <ul className="mt-4 space-y-2">
          {[
            "Unlimited local imports",
            "On-device vibe checks",
            "Local Wingman replies",
          ].map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-[11px] font-medium text-on-primary-container/90"
            >
              <Icon
                name="check"
                className="size-3.5 shrink-0 text-primary"
                strokeWidth={2.6}
              />
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled
          className={cn(btnOutline, "mt-5 w-full border-primary/25 bg-surface-container-lowest/40 text-on-primary-container disabled:opacity-60")}
        >
          <Icon name="sparkles" className="size-4" />
          Pro upgrade lands in Phase 5
        </button>
      </div>
    </section>
  );
}

type ConfirmAction = "library" | "reset" | null;

export function DataSettings() {
  const chatCount = useLiveQuery(
    () => getDb().parsedChats.count(),
    [],
    undefined,
  );
  const preferenceRows = useLiveQuery(
    () => getDb().userPreferences.count(),
    [],
    undefined,
  );

  const [confirming, setConfirming] = useState<ConfirmAction>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run(action: Exclude<ConfirmAction, null>) {
    setBusy(true);
    setNote(null);
    try {
      if (action === "library") {
        await clearChatLibrary();
        setNote("Chat library cleared. Preferences were kept.");
      } else {
        await resetLocalData();
        setNote("Local database reset. Theme and plan returned to defaults.");
      }
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  const rows = [
    { label: "Database", value: "chat-analyse · IndexedDB" },
    {
      label: "Chat exports",
      value: chatCount === undefined ? "…" : pluralize(chatCount, "row"),
    },
    {
      label: "Preference rows",
      value: preferenceRows === undefined ? "…" : String(preferenceRows),
    },
    { label: "Network egress", value: "Never on the free tier" },
  ];

  return (
    <section className={cn(cardSurface, "p-5 sm:p-6")}>
      <div>
        <p className={eyebrow}>Data & privacy</p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em]">
          Local storage
        </h3>
      </div>

      <dl className="mt-4 divide-y divide-outline-variant/40 overflow-hidden rounded-[18px] border border-outline-variant/45 bg-surface-container-lowest/40">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <dt className="text-[11px] font-medium text-on-surface-variant">
              {row.label}
            </dt>
            <dd className="text-right font-mono text-[11px] text-on-surface">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-2.5">
        {confirming === null ? (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setConfirming("library")}
              className={cn(btnOutline, "px-4 py-2.5 text-xs")}
              disabled={chatCount === 0}
            >
              <Icon name="trash" className="size-4" />
              Clear chat library
            </button>
            <button
              type="button"
              onClick={() => setConfirming("reset")}
              className={cn(
                btnGhost,
                "px-4 py-2.5 text-xs text-error hover:bg-error-container hover:text-on-error-container",
              )}
            >
              <Icon name="refresh" className="size-4" />
              Reset all local data
            </button>
          </div>
        ) : (
          <div
            className={cn(
              "animate-fade-up rounded-[18px] border p-4",
              confirming === "library"
                ? "border-outline-variant/60 bg-surface-container-high/60"
                : "border-error/30 bg-error-container/30",
            )}
          >
            <p className="text-xs font-semibold text-on-surface">
              {confirming === "library"
                ? `Delete all ${pluralize(chatCount ?? 0, "import")}?`
                : "Reset the entire local database?"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
              {confirming === "library"
                ? "Raw exports will be removed from this browser. This cannot be undone."
                : "Chats, theme, and plan state will return to defaults. This cannot be undone."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void run(confirming)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-error px-3.5 py-2 text-[11px] font-semibold text-on-error disabled:opacity-60"
              >
                {busy ? <Spinner className="size-3.5" /> : null}
                {confirming === "library" ? "Delete imports" : "Reset database"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={busy}
                className="rounded-full px-3 py-2 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container-high"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p aria-live="polite" className="min-h-4 text-[11px] text-secondary">
          {note}
        </p>
      </div>
    </section>
  );
}
