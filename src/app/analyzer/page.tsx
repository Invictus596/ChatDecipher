import type { Metadata } from "next";
import { AnalyzerDashboard } from "@/components/analyzer/analyzer-dashboard";
import { ChatDropzone } from "@/components/chat-dropzone";
import { ChatLibrary } from "@/components/chat-library";
import { Icon } from "@/components/ui/icon";
import { DB_NAME } from "@/lib/db";
import { cardSurface, eyebrow } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Chat Analyzer",
  description:
    "Import WhatsApp .txt or Telegram .json exports for on-device metrics, charts, and a local WebLLM Vibe Check.",
};

const importSteps = [
  {
    icon: "fileText" as const,
    title: "Read in-browser",
    copy: "FileReader keeps the export inside this tab.",
  },
  {
    icon: "database" as const,
    title: "Stored in IndexedDB",
    copy: "Dexie persists raw chunks locally for reuse.",
  },
  {
    icon: "chart" as const,
    title: "Parsed locally",
    copy: "Timestamped messages feed the on-device dashboard.",
  },
];

export default function AnalyzerPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <header className="max-w-2xl">
        <p className={eyebrow}>Chat Analyzer</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Bring your own export.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-[15px]">
          Imports are read, validated, and parsed in this browser only. The
          on-device engine extracts messages, senders, and activity, then an
          optional local model can write a Vibe Check — no file ever leaves your
          device.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <ChatDropzone />

        <div className="space-y-5">
          <section className={cn(cardSurface, "p-5 sm:p-6")}>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name="download" className="size-4" />
              </span>
              <h3 className="font-display text-base font-semibold">
                Getting the file
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">
                  <Icon name="chat" className="size-3.5" />
                  WhatsApp
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
                  Open the chat → <span className="font-semibold text-on-surface">⋮</span>{" "}
                  → More → Export chat →{" "}
                  <span className="font-semibold text-on-surface">Without media</span>.
                </p>
              </div>

              <div className="h-px bg-outline-variant/50" />

              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                  <Icon name="braces" className="size-3.5" />
                  Telegram
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
                  Telegram Desktop → menu → Export chat history →{" "}
                  <span className="font-semibold text-on-surface">JSON</span> →
                  deselect photos and files.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-container-high/70 p-3">
              <Icon
                name="info"
                className="mt-0.5 size-3.5 shrink-0 text-on-surface-variant"
              />
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                Media makes exports huge. Text-only keeps files small, fast, and
                under the 20 MB limit.
              </p>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[28px] border border-secondary/30 bg-secondary-container/35 p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-secondary/15 blur-2xl"
              aria-hidden
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-secondary-container/80">
                Phase 3 · Local AI
              </p>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-on-secondary">
                Live
              </span>
            </div>
            <h3 className="mt-2 font-display text-base font-semibold text-on-secondary-container">
              The on-device Vibe Check
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                "WebLLM runs in a dedicated Web Worker",
                "Llama 3.2 1B or Qwen 2.5 1.5B, cached locally",
                "Streams a Markdown tone and topic summary",
                "Polite fallback when WebGPU is unavailable",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-[11px] leading-relaxed text-on-secondary-container/85"
                >
                  <Icon
                    name="check"
                    className="mt-0.5 size-3 shrink-0"
                    strokeWidth={2.6}
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-secondary/20 pt-3 text-[10px] font-medium leading-relaxed text-on-secondary-container/70">
              Model weights download once and stay in the browser cache. Chat
              text is passed only to the local worker.
            </p>
          </section>
        </div>
      </div>

      <AnalyzerDashboard />

      {/* What happens on import ------------------------------------------ */}
      <section className="grid gap-3 sm:grid-cols-3">
        {importSteps.map((step, index) => (
          <div
            key={step.title}
            className="flex items-start gap-3 rounded-[22px] border border-outline-variant/45 bg-surface-container-low/60 p-4"
          >
            <span className="relative grid size-9 shrink-0 place-items-center rounded-[12px] bg-surface-container-highest text-on-surface-variant">
              <Icon name={step.icon} className="size-[17px]" />
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[8px] font-bold text-on-primary">
                {index + 1}
              </span>
            </span>
            <div>
              <p className="text-xs font-semibold text-on-surface">{step.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant">
                {step.copy}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className={cn(cardSurface, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className={eyebrow}>IndexedDB · {DB_NAME}</p>
            <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]">
              Local library
            </h3>
          </div>
          <p className="text-[11px] font-medium text-on-surface-variant">
            Raw exports and parsed results stay in this browser.
          </p>
        </div>

        <ChatLibrary
          showClear
          showEmptyLink={false}
          className="mt-5"
        />
      </section>
    </div>
  );
}
