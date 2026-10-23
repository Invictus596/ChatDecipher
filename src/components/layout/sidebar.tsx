"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { BrandMark, Icon } from "@/components/ui/icon";
import { getDb } from "@/lib/db";
import { NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const preferences = useLiveQuery(
    () => getDb().userPreferences.get("app"),
    [],
    undefined,
  );
  const isPremium = preferences?.premiumStatus ?? false;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-outline-variant/50 bg-surface-container-low/70 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link
        href="/"
        className="group mx-2 flex items-center gap-3 rounded-2xl outline-offset-4"
        aria-label="ChatDecipher home"
      >
        <BrandMark className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-105" />
        <span className="flex flex-col">
          <span className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.02em]">
            ChatDecipher
            <span className="rounded-full bg-secondary-container px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-on-secondary-container">
              Beta
            </span>
          </span>
          <span className="text-[11px] font-medium text-on-surface-variant">
            Private chat intelligence
          </span>
        </span>
      </Link>

      <nav className="mt-9 flex flex-col gap-1.5" aria-label="Primary">
        <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/80">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-semibold outline-offset-4",
                "transition-[transform,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                active
                  ? "bg-primary-container text-on-primary-container shadow-[var(--elevation-1)]"
                  : "text-on-surface-variant hover:translate-x-0.5 hover:bg-surface-container-high hover:text-on-surface",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full transition-colors duration-300",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest/70 text-on-surface-variant group-hover:text-on-surface",
                )}
              >
                <Icon name={item.icon} className="size-[18px]" />
              </span>
              <span className="flex flex-col">
                {item.label}
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    active
                      ? "text-on-primary-container/70"
                      : "text-on-surface-variant/70",
                  )}
                >
                  {item.description}
                </span>
              </span>
              {active ? (
                <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-[24px] border border-secondary/20 bg-secondary-container/35 p-4">
          <div
            className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-secondary/15 blur-xl"
            aria-hidden
          />
          <div className="flex items-center gap-2 text-secondary">
            <Icon name="shield" className="size-4" strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
              100% on-device
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
            Exports live in this browser&apos;s IndexedDB. Free-tier chats are
            never uploaded.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-on-surface-variant">
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden />
            Network idle by design
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[18px] border border-outline-variant/50 bg-surface-container-lowest/50 px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Icon name="sparkles" className="size-4 text-tertiary" />
            {isPremium ? "Pro plan" : "Free plan"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
            v0.2 · P2
          </span>
        </div>
      </div>
    </aside>
  );
}
