# ChatDecipher

A privacy-first, local-processing chat analyzer and Wingman app.

> **Status: Phase 1 of 5** — scaffold, Material 3 Expressive shell, IndexedDB schema, and chat-export intake.
> Chats are stored in the browser. Nothing is uploaded.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, `output: "export"`) |
| Styling | Tailwind CSS 4 + Material 3 Expressive tokens |
| Local persistence | Dexie 4 (IndexedDB) |
| Local AI (Phase 3) | `@mlc-ai/web-llm` in a Web Worker |
| Local OCR (Phase 4) | `tesseract.js` |
| Premium API (Phase 4/5) | Next.js API routes → Claude / GPT-4o |

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # static export into ./out (+ RSC filename fix)
npm run preview    # serve ./out with `serve`
```

> **Windows static-export note:** Next 16.4 writes nested `__next.*` folders for
> RSC payloads on Windows, while the client router requests flat dotted names.
> `scripts/fix-static-export-rsc.mjs` runs after every build and flattens them.
> Upstream issue: [vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374).
> The script is a no-op on Linux/macOS.

## What Phase 1 includes

- **App shell** — desktop sidebar, sticky top bar, mobile bottom navigation,
  responsive content area, skip link.
- **Material 3 Expressive design system** — tonal color roles, 28–32px shape
  scale, spring-ish motion curves, emphasized display type, light/dark/system
  themes. All shared as CSS variables in `src/app/globals.css`.
- **Dexie schema** (`src/lib/db.ts`):
  - `parsedChats`: `id`, `platform`, `contactName`, `messageCount`,
    `rawChunks`, `timestamp`
  - `userPreferences`: singleton row with `theme` + `premiumStatus`
- **Theme persistence** — IndexedDB is the source of truth; localStorage is a
  boot-time mirror so dark mode paints without a flash.
- **Upload zone** — drag/drop or browse for `.txt` (WhatsApp) and `.json`
  (Telegram), 20 MB cap, multi-file, validation, progress, and inline
  success/error feedback. Raw text is persisted to `parsedChats` and appears in
  the local library with delete / clear-all.
- **Dashboard** — illustrative preview, local stats, recent imports, roadmap.
- **Settings** — theme picker, plan card, storage inspector, clear/reset actions.

Deliberately **not** built yet: message parsing and metrics (Phase 2), WebLLM
(Phase 3), OCR/Wingman generation (Phase 4), premium gating (Phase 5).

## Docs

- [Android packaging plan](docs/android-packaging.md) — PWA-first, TWA for the
  Play Store, with the WebGPU/WebView constraints and test matrix.

## Privacy model

- Static export → no server rendering of user data, deployable anywhere.
- No analytics, no accounts, no network requests for chat content.
- The only optional network use in later phases is downloading model weights
  (Phase 3) and explicit, opt-in Pro generation on redacted text (Phase 4/5).

## Project layout

```
src/
  app/                 # routes: /, /analyzer, /wingman, /settings
  components/
    layout/            # sidebar, top bar, mobile nav, shell
    settings/          # appearance, plan, data panels
    chat-dropzone.tsx  # Phase 1 intake
    chat-library.tsx   # Dexie-backed local library
    library-stats.tsx  # on-device counters
    theme-provider.tsx # theme context + persistence
  lib/
    db.ts              # Dexie schema + helpers
    chat-files.ts      # upload validation rules
    navigation.ts      # nav config
    styles.ts          # shared class recipes
scripts/
  fix-static-export-rsc.mjs  # Windows RSC path workaround
```

## Phase 1 test checklist

1. `npm run dev`, open the dashboard.
2. Drag a WhatsApp `.txt` export onto **Chat Analyzer** — a success banner and a
   “Queued” library row should appear.
3. Refresh the page: the import should still be there (IndexedDB).
4. Toggle dark mode in the top bar, refresh — it should persist.
5. Open **Settings → Data & privacy** and clear the library; the dashboard
   counters return to zero.
6. Try an unsupported file (e.g. `.pdf`) to see inline validation feedback.
