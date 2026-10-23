"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark, Icon } from "@/components/ui/icon";
import { navItemForPath } from "@/lib/navigation";

export function TopBar() {
  const pathname = usePathname();
  const current = navItemForPath(pathname);

  return (
    <header className="glass-bar sticky top-0 z-30 border-b border-outline-variant/40">
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-9 rounded-[13px] lg:hidden" />
          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/80 lg:block">
              Workspace
            </p>
            <h1 className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">
              {current.label}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary-container/45 px-3 py-1.5 text-[11px] font-bold text-on-secondary-container sm:flex">
            <Icon name="lock" className="size-3.5" strokeWidth={2.2} />
            Local-only
          </span>
          <ThemeToggle />
          <span
            className="hidden size-10 place-items-center rounded-full border border-outline-variant/50 bg-surface-container-high/70 font-display text-xs font-bold text-on-surface-variant sm:grid"
            aria-hidden
            title="No account required"
          >
            You
          </span>
        </div>
      </div>
    </header>
  );
}
