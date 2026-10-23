import Link from "next/link";
import { ChatLibrary } from "@/components/chat-library";
import { LibraryStats } from "@/components/library-stats";
import { Icon } from "@/components/ui/icon";
import { btnFilled, btnTonal, cardSurface, eyebrow } from "@/lib/styles";
import { cn } from "@/lib/utils";

const roadmap = [
  {
    phase: 1,
    title: "Shell & local storage",
    note: "Sidebar, Dexie, uploads",
    status: "Done",
    tone: "live",
  },
  {
    phase: 2,
    title: "Parsing engine",
    note: "Senders, timelines, charts",
    status: "Live now",
    tone: "live",
  },
  {
    phase: 3,
    title: "WebLLM vibe check",
    note: "On-device summaries",
    status: "Next",
    tone: "next",
  },
  {
    phase: 4,
    title: "Wingman mode",
    note: "Screenshot OCR + replies",
    status: "Queued",
    tone: "queued",
  },
  {
    phase: 5,
    title: "Premium polish",
    note: "Pro gates & motion",
    status: "Queued",
    tone: "queued",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-[34px] border border-outline-variant/50 bg-surface-container-low/85 p-6 sm:p-9 lg:p-10">
        <div
          className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-1/4 size-64 rounded-full bg-tertiary/15 blur-3xl"
          aria-hidden
        />

        <div className="relative grid items-center gap-9 lg:grid-cols-[1.35fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary-container/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-secondary-container">
              <span className="size-1.5 rounded-full bg-secondary" aria-hidden />
              Local-first · No uploads
            </span>

            <h2 className="mt-5 font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
              Read the room.
              <br />
              <span className="brand-gradient-text">Keep the receipts.</span>
            </h2>

            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-on-surface-variant">
              Drop a WhatsApp or Telegram export and turn it into tone, momentum,
              and better replies. Every byte is analyzed in your browser — free
              tier chats never touch a server.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/analyzer" className={btnFilled}>
                <Icon name="upload" className="size-4" />
                Analyze a chat
              </Link>
              <Link href="/wingman" className={btnTonal}>
                <Icon name="sparkles" className="size-4" />
                Open Wingman Mode
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-on-surface-variant">
              {["No account", "No uploads", "No tracking"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Icon
                    name="check"
                    className="size-3.5 text-secondary"
                    strokeWidth={2.6}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Stats ------------------------------------------------------------ */}
      <section aria-labelledby="glance-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className={eyebrow}>On this device</p>
            <h2
              id="glance-heading"
              className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]"
            >
              At a glance
            </h2>
          </div>
          <Link
            href="/analyzer"
            className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-container/50"
          >
            Manage library
            <Icon
              name="arrowRight"
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <LibraryStats />
      </section>

      {/* Library + roadmap ----------------------------------------------- */}
      <div className="grid items-start gap-5 lg:grid-cols-[1.45fr_1fr]">
        <section className={cn(cardSurface, "p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={eyebrow}>IndexedDB</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.015em]">
                Recent imports
              </h2>
            </div>
            <Link
              href="/analyzer"
              className="group inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Open analyzer
              <Icon
                name="chevronRight"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <ChatLibrary limit={4} className="mt-4" />
        </section>

        <section className={cn(cardSurface, "p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={eyebrow}>Build status</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.015em]">
                Roadmap
              </h2>
            </div>
            <span className="rounded-full bg-primary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-on-primary-container">
              Phase 2
            </span>
          </div>

          <ol className="mt-5 space-y-1">
            {roadmap.map((item) => (
              <li
                key={item.phase}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors",
                  item.phase === 2 && "bg-surface-container-high/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    item.tone === "live"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-highest text-on-surface-variant",
                  )}
                >
                  {item.tone === "live" ? (
                    <Icon name="check" className="size-3.5" strokeWidth={3} />
                  ) : (
                    item.phase
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-on-surface">
                    {item.title}
                  </span>
                  <span className="block truncate text-[11px] text-on-surface-variant">
                    {item.note}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
                    item.tone === "live" &&
                      "bg-secondary-container text-on-secondary-container",
                    item.tone === "next" &&
                      "bg-primary-container text-on-primary-container",
                    item.tone === "queued" &&
                      "bg-surface-container-highest text-on-surface-variant",
                  )}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Privacy strip ---------------------------------------------------- */}
      <section
        className={cn(
          cardSurface,
          "grid gap-4 p-5 sm:grid-cols-3 sm:p-6",
        )}
      >
        {[
          {
            icon: "shield" as const,
            title: "On-device by default",
            copy: "Parsing, metrics, and local AI all run in this tab.",
            tone: "text-secondary",
          },
          {
            icon: "lock" as const,
            title: "No account, no cloud",
            copy: "There is nothing to sign up for and nothing to sync.",
            tone: "text-primary",
          },
          {
            icon: "cpu" as const,
            title: "WebGPU when ready",
            copy: "Phase 3 brings a quantized model you download once.",
            tone: "text-tertiary",
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-[12px] bg-surface-container-high",
                item.tone,
              )}
            >
              <Icon name={item.icon} className="size-[18px]" />
            </span>
            <div>
              <p className="text-xs font-semibold text-on-surface">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant">
                {item.copy}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-primary/20 via-transparent to-tertiary/20 blur-2xl" />

      <div className="relative rounded-[28px] border border-outline-variant/60 bg-surface-container-lowest/85 p-4 shadow-[var(--elevation-3)] backdrop-blur-xl sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            Vibe check · preview
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-1 text-[9px] font-bold text-on-secondary-container">
            <span className="size-1 rounded-full bg-secondary" />
            Local
          </span>
        </div>

        <div className="mt-4 space-y-2 text-[12px] leading-snug">
          <div className="max-w-[85%] rounded-[16px] rounded-bl-md bg-surface-container-high px-3 py-2 text-on-surface">
            hey! still on for friday?
          </div>
          <div className="ml-auto max-w-[85%] rounded-[16px] rounded-br-md bg-primary px-3 py-2 text-on-primary">
            wouldn&apos;t miss it 😄
          </div>
          <div className="max-w-[85%] rounded-[16px] rounded-bl-md bg-surface-container-high px-3 py-2 text-on-surface">
            perfect. bring the playlist
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-outline-variant/50 bg-surface-container/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              Signal
            </span>
            <span className="text-[10px] font-bold text-secondary">Warm</span>
          </div>
          <div className="mt-2.5 space-y-2">
            {[
              { label: "Warmth", value: 82, color: "bg-secondary" },
              { label: "Momentum", value: 71, color: "bg-primary" },
              { label: "Playfulness", value: 64, color: "bg-tertiary" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
                  <span>{metric.label}</span>
                  <span className="font-semibold">{metric.value}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className={cn("h-full rounded-full", metric.color)}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 text-center text-[9px] leading-relaxed text-on-surface-variant/80">
          Illustrative preview — open the analyzer for live on-device metrics.
        </p>
      </div>
    </div>
  );
}
