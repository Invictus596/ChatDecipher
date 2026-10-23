import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VibeCheck — private chat intelligence",
    template: "%s · VibeCheck",
  },
  description:
    "Analyze WhatsApp and Telegram exports, read the room, and sharpen your replies — all on your own device. No uploads, no account, no tracking.",
  applicationName: "VibeCheck",
  keywords: [
    "chat analyzer",
    "WhatsApp analytics",
    "Telegram analytics",
    "local-first",
    "privacy",
    "WebGPU",
    "WebLLM",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8ff" },
    { media: "(prefers-color-scheme: dark)", color: "#121118" },
  ],
};

/**
 * Applies the mirrored theme preference before first paint so dark-mode users
 * never see a light flash. IndexedDB remains the source of truth; this only
 * reads the localStorage mirror written by the theme provider.
 */
const themeBootScript = `(function(){try{var t=localStorage.getItem("vibecheck:theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
