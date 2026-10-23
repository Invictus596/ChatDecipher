import type { Metadata } from "next";
import {
  AppearanceSettings,
  DataSettings,
  PlanSettings,
} from "@/components/settings/settings-panels";
import { Icon } from "@/components/ui/icon";
import { cardSurface, eyebrow } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme, plan, and local data controls for ChatDecipher.",
};

const stack = [
  "Next.js 16 · static export",
  "Tailwind CSS 4",
  "Dexie 4 · IndexedDB",
  "Recharts 3 · local charts",
  "WebLLM · WebGPU worker",
  "Tesseract.js · Phase 4",
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <header className="max-w-2xl">
        <p className={eyebrow}>Settings</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Your device, your rules.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-[15px]">
          Appearance and local data controls. There are no server-side settings
          because there is no account.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-5">
          <AppearanceSettings />
          <DataSettings />
        </div>

        <div className="space-y-5">
          <PlanSettings />

          <section className={cn(cardSurface, "p-5 sm:p-6")}>
            <p className={eyebrow}>About</p>
            <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em]">
              This build
            </h3>
            <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
              Phase 3 of the local-first chat intelligence app: on-device
              parsers, metrics, charts, and an optional WebLLM Vibe Check that
              runs in a WebGPU Web Worker.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-outline-variant/60 bg-surface-container-lowest/60 px-2.5 py-1 font-mono text-[10px] text-on-surface-variant"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-secondary-container/30 p-3">
              <Icon
                name="shield"
                className="mt-0.5 size-3.5 shrink-0 text-secondary"
              />
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                Static export means the whole app can be hosted anywhere — the
                data still never leaves the browser.
              </p>
            </div>

            <p className="mt-4 font-mono text-[10px] text-on-surface-variant/70">
              v0.3.0 · build phase 3 / 5
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
