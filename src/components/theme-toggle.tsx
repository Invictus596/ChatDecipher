"use client";

import { useTheme } from "@/components/theme-provider";
import { Icon } from "@/components/ui/icon";
import { iconButton } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, isReady } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={cn(
        iconButton,
        "group relative overflow-hidden border border-outline-variant/50 bg-surface-container-lowest/50",
        className,
      )}
      aria-label={label}
      title={label}
      disabled={!isReady}
    >
      <Icon
        name="sun"
        className={cn(
          "absolute size-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          resolvedTheme === "dark"
            ? "-translate-y-8 rotate-90 opacity-0"
            : "translate-y-0 rotate-0 opacity-100 group-hover:rotate-[25deg]",
        )}
      />
      <Icon
        name="moon"
        className={cn(
          "absolute size-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          resolvedTheme === "dark"
            ? "translate-y-0 rotate-0 opacity-100 group-hover:-rotate-12"
            : "translate-y-8 -rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
