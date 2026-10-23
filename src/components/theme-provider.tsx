"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  PREFERENCES_ID,
  createDefaultPreferences,
  ensurePreferences,
  getDb,
  type ThemePreference,
} from "@/lib/db";

export const THEME_STORAGE_KEY = "vibecheck:theme";

type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isReady: boolean;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // liveQuery runs in a read-only transaction, so the querier must never write.
  const preferences = useLiveQuery(
    () => getDb().userPreferences.get(PREFERENCES_ID),
    [],
  );

  const [systemDark, setSystemDark] = useState(false);

  // Seed the singleton preferences row outside the live query.
  useEffect(() => {
    void ensurePreferences();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);

    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const theme = preferences?.theme ?? "system";
  const resolvedTheme: ResolvedTheme =
    theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";

  // Reflect the resolved theme on <html> and mirror the *preference* (not the
  // resolved value) to localStorage so the boot script can apply it instantly.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (!preferences) return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preferences.theme);
    } catch {
      // Storage can be blocked in private modes — the app still works.
    }
  }, [preferences]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    const root = document.documentElement;
    const nextIsDark =
      nextTheme === "dark" ||
      (nextTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    root.classList.toggle("dark", nextIsDark);
    root.style.colorScheme = nextIsDark ? "dark" : "light";

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // ignore
    }

    void (async () => {
      const db = getDb();
      const existing =
        (await db.userPreferences.get("app")) ?? createDefaultPreferences();
      await db.userPreferences.put({
        ...existing,
        id: "app",
        theme: nextTheme,
        updatedAt: Date.now(),
      });
    })();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      isReady: Boolean(preferences),
      setTheme,
    }),
    [theme, resolvedTheme, preferences, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return context;
}
