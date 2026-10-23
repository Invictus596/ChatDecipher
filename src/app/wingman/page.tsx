import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { btnFilled, cardSurface, eyebrow } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Wingman Mode",
  description:
    "Turn dating-app screenshots into smarter replies with on-device OCR and redaction.",
};

const pipeline = [
  {
    step: "01",
    icon: "image" as const,
    title: "Drop a screenshot",
    copy: "A dating-app conversation, a profile, or a tricky thread. PNG, JPG, or WebP.",
    tone: "bg-primary-container text-on-primary-container",
  },
  {
    step: "02",
    icon: "cpu" as const,
    title: "Read & redact locally",
    copy: "Tesseract.js extracts the text in-browser; a regex pass masks phones, emails, and names.",
    tone: "bg-secondary-container text-on-secondary-container",
  },
  {
    step: "03",
    icon: "sparkles" as const,
    title: "Pick a reply",
    copy: "Three options tuned to tone: playful, warm, or direct — with a local or Pro engine.",
    tone: "bg-tertiary-container text-on-tertiary-container",
  },
];

const planned = [
  "Screenshot intake with paste support",
  "On-device OCR via Tesseract.js",
  "PII redaction preview before any generation",
  "Three reply styles with tone controls",
  "Local WebLLM replies on the free tier",
  "Opt-in cloud replies for Pro members",
];

export default function WingmanPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <header className="max-w-2xl">
        <p className={eyebrow}>Wingman Mode</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Screenshot in.
          <br />
          <span className="brand-gradient-text">Better reply out.</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-[15px]">
          Dating apps live on screenshots. Wingman Mode reads them on-device,
          strips the personal details, and drafts replies that sound like you —
          not like a chatbot.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-[34px] border border-outline-variant/50 bg-surface-container-low/85 p-6 sm:p-9">
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-tertiary/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/4 size-64 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/25 bg-tertiary-container/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-tertiary-container">
              <Icon name="lock" className="size-3.5" />
              Phase 4 · in design
            </span>

            <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl">
              No screenshots uploaded.
              <br />
              No names sent to a model.
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-on-surface-variant">
              The OCR pass and redaction layer are 100% local. Even the optional
              cloud engine only ever sees text you have reviewed and masked.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" disabled className={btnFilled}>
                <Icon name="image" className="size-4" />
                Screenshot intake in Phase 4
              </button>
              <Link
                href="/analyzer"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-container/50"
              >
                Try chat import now
                <Icon name="arrowRight" className="size-3.5" />
              </Link>
            </div>
          </div>

          <WingmanPreview />
        </div>
      </section>

      <section aria-labelledby="pipeline-heading">
        <div className="mb-4">
          <p className={eyebrow}>The pipeline</p>
          <h3
            id="pipeline-heading"
            className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]"
          >
            Local first, cloud optional
          </h3>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {pipeline.map((item) => (
            <article
              key={item.step}
              className="group rounded-[24px] border border-outline-variant/50 bg-surface-container-low/70 p-5 spring hover:-translate-y-1 hover:shadow-[var(--elevation-2)]"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-[14px]",
                    item.tone,
                  )}
                >
                  <Icon name={item.icon} className="size-[18px]" />
                </span>
                <span className="font-mono text-[11px] font-semibold text-on-surface-variant/60">
                  {item.step}
                </span>
              </div>
              <h4 className="mt-4 text-sm font-semibold text-on-surface">
                {item.title}
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                {item.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className={cn(cardSurface, "p-5 sm:p-6")}>
          <p className={eyebrow}>Planned for Phase 4</p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em]">
            What ships next
          </h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {planned.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Icon
                  name="check"
                  className="mt-0.5 size-3.5 shrink-0 text-secondary"
                  strokeWidth={2.4}
                />
                <span className="text-[11px] leading-relaxed text-on-surface-variant">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-secondary/25 bg-secondary-container/30 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-secondary">
            <Icon name="shield" className="size-4" strokeWidth={2.2} />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
              Privacy contract
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-on-surface">
            Screenshots and extracted text stay in memory (and IndexedDB only if
            you choose to save a draft). Cloud generation is opt-in and receives
            redacted text alone.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
          >
            Review local data settings
            <Icon name="chevronRight" className="size-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function WingmanPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[320px]" aria-hidden="true">
      <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-tertiary/15 via-transparent to-primary/15 blur-2xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-outline-variant/60 bg-surface-container-lowest/90 p-4 shadow-[var(--elevation-3)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            OCR preview
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-1 text-[9px] font-bold text-on-secondary-container">
            Redacted
          </span>
        </div>

        <div className="mt-3 rounded-[18px] border border-outline-variant/50 bg-surface-container/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
            Extracted
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-on-surface">
            &ldquo;Honestly, that hiking photo is unfair. Where was that?&rdquo;
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["[NAME]", "[PHONE]", "No email"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-container-highest px-2 py-0.5 font-mono text-[9px] text-on-surface-variant"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {[
            { label: "Playful", text: "Fair? I was trying to look normal.", selected: true },
            { label: "Warm", text: "Somewhere I'd happily take you.", selected: false },
            { label: "Direct", text: "Local trail. Want the pin?", selected: false },
          ].map((reply) => (
            <div
              key={reply.label}
              className={cn(
                "rounded-[16px] border px-3 py-2.5",
                reply.selected
                  ? "border-primary/40 bg-primary-container/50"
                  : "border-outline-variant/50 bg-surface-container-low/70",
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                {reply.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-on-surface">
                {reply.text}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-[9px] leading-relaxed text-on-surface-variant/80">
          Mock preview — generation lands in Phase 4.
        </p>
      </div>
    </div>
  );
}
