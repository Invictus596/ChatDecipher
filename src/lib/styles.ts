import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold tracking-[-0.01em] " +
  "transition-[transform,box-shadow,background-color,color] duration-300 " +
  "ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export const btnFilled = cn(
  base,
  "bg-primary px-5 py-3 text-on-primary shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-3)] hover:-translate-y-0.5",
);

export const btnTonal = cn(
  base,
  "bg-primary-container px-5 py-3 text-on-primary-container hover:shadow-[var(--elevation-2)] hover:-translate-y-0.5",
);

export const btnOutline = cn(
  base,
  "border border-outline-variant bg-surface-container-lowest/60 px-5 py-3 text-on-surface hover:border-primary/45 hover:bg-surface-container-high",
);

export const btnGhost = cn(
  base,
  "px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
);

export const iconButton = cn(
  "inline-flex size-10 items-center justify-center rounded-full text-on-surface-variant " +
    "transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] " +
    "hover:bg-surface-container-high hover:text-on-surface active:scale-95",
);

export const cardSurface =
  "rounded-[28px] border border-outline-variant/60 bg-surface-container-low";

export const cardInteractive = cn(
  cardSurface,
  "spring hover:-translate-y-1 hover:shadow-[var(--elevation-3)]",
);

export const eyebrow =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant";

export const fieldLabel = "text-sm font-semibold text-on-surface";
