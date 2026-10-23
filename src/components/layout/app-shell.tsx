import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="app-aurora" aria-hidden="true" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-on-primary"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="lg:pl-[272px]">
        <TopBar />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-16 lg:pt-9"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </>
  );
}
