"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/50 pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-3 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold"
            >
              <span
                className={cn(
                  "grid h-8 w-16 place-items-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant group-hover:bg-surface-container-high",
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "size-5 transition-transform duration-300",
                    active ? "scale-110" : "group-active:scale-90",
                  )}
                />
              </span>
              <span
                className={cn(
                  "transition-colors",
                  active ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
