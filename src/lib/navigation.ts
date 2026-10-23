import type { IconName } from "@/components/ui/icon";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    description: "Your local overview",
    icon: "dashboard",
  },
  {
    href: "/analyzer",
    label: "Chat Analyzer",
    shortLabel: "Analyze",
    description: "Import and dissect exports",
    icon: "chart",
  },
  {
    href: "/wingman",
    label: "Wingman Mode",
    shortLabel: "Wingman",
    description: "Screenshot-to-reply coach",
    icon: "sparkles",
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    description: "Appearance and local data",
    icon: "settings",
  },
];

export function isActivePath(pathname: string, href: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (href === "/") return normalized === "/";
  return normalized === href || normalized.startsWith(`${href}/`);
}

export function navItemForPath(pathname: string): NavItem {
  return NAV_ITEMS.find((item) => isActivePath(pathname, item.href)) ?? NAV_ITEMS[0];
}
