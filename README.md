# ChatDecipher

A privacy-first, local-processing chat analyzer and Wingman app.

> **Status: Phase 3 of 5** — local WhatsApp/Telegram parsers, quantitative
> metrics, a Recharts dashboard, and an optional on-device WebLLM Vibe Check.
> Free-tier chat data never leaves the browser.

![ChatDecipher dashboard in dark mode](docs/dashboard.png)

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, `output: "export"`) |
| Styling | Tailwind CSS 4 + Material 3 Expressive tokens |
| Local persistence | Dexie 4 (IndexedDB) |
| Charts | Recharts 3 |
| Icons | lucide-react + a built-in SVG set |
| Local AI | `@mlc-ai/web-llm` 0.2.86 in a Web Worker |
| Markdown | `react-markdown` + `remark-gfm` |
| Local OCR (Phase 4) | `tesseract.js` |
| Premium API (Phase 4/5) | Separate serverless origin → Claude / GPT-4o |

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

## What Phase 3 adds

- **WebLLM in a dedicated Web Worker** (`src/workers/webllm.worker.ts`) — model
  loading and token generation run off the main thread, so React stays
  responsive while the GPU works. The worker is created only after the user opts
  in.
- **Local Vibe Check** (`src/components/model-loader.tsx`) — choose Llama 3.2 1B
  (≈0.7 GB download, ≈0.9 GB GPU memory) or Qwen 2.5 1.5B (≈1.0 GB download,
  ≈1.6 GB GPU memory), then watch a live download/progress bar driven by
  WebLLM's `initProgressCallback`.
- **Context-safe sampling** (`src/lib/vibe-check.ts`) — reads normalized
  messages from Dexie, drops media placeholders and deleted-message stubs, uses
  up to the most recent 300 useful messages, and trims the oldest lines to an
  8,000 character budget for the model's 4K context window.
- **Streaming Markdown output** — the response streams token by token into a
  Material 3 card and is rendered with `react-markdown` + `remark-gfm`.
- **Graceful WebGPU fallback** — the panel detects missing WebGPU/adapters and
  shows a polite explanation. The Phase 2 metrics and charts keep working.
- **No cloud AI** — there are no OpenAI, Anthropic, or other inference API
  calls. The only optional network request is the one-time model-weight
  download from the Hugging Face CDN; chat text is sent only to the local
  worker.

![ChatDecipher analyzer with on-device charts](docs/analyzer.png)

## Phase 2 foundations

- **WhatsApp `.txt` parser** (`src/lib/parsers/whatsapp.ts`) — handles the
  bracketed iOS shape (`[12/03/24, 9:41:05 PM] Alice: …`) and the Android shape
  (`12/03/24, 21:41 - Alice: …`), 12/24-hour clocks, `/`, `.`, and `-` date
  separators, multiline messages, system notices, and the invisible directional
  marks WhatsApp adds to exports.
- **Telegram `.json` normalizer** (`src/lib/parsers/telegram.ts`) — reads
  standard Telegram Desktop exports, flattens string/entity-array message text,
  uses `date_unixtime` when available, skips service and media-only rows, and
  adopts the export title as the contact name.
- **Quantitative metrics** (`src/lib/metrics.ts`) — total messages, counts by
  sender, top contributor, unique senders, active days, average messages per
  active day, and continuous daily/monthly activity series.
- **Automatic local queue** (`src/lib/process-chat.ts`) — the analyzer finds
  queued Dexie records, parses them on the main thread, persists metrics, and
  flips the record from `Queued` to `Parsed`. Failures become `Error` with a
  readable reason and a retry action. Nothing is uploaded.
- **Recharts dashboard** — total/active-day/top-contributor/average stat cards,
  a messages-per-sender bar chart, an activity-over-time area chart with
  day/month granularity, a multi-chat picker, and a manual reparse action.
- **M3 Expressive presentation** — tonal chart cards, theme-aware palettes,
  responsive 2-up/stacked layouts, accessible chart summaries, and a mobile
  layout with no horizontal overflow.

### Phase 1 foundations

- Desktop sidebar, sticky top bar, mobile bottom navigation, skip link.
- Material 3 Expressive tokens, 28–32px shapes, spring-ish motion, and
  light/dark/system themes. Theme lives in IndexedDB with a localStorage
  boot-time mirror.
- Drag/drop or browse for `.txt` / `.json`, 20 MB cap, multi-file validation,
  progress, and inline feedback.
- Local library with status badges, per-chat delete, clear-all confirmation, and
  a storage inspector in Settings.

## Parser notes

- **Ambiguous dates:** WhatsApp exports use the phone's locale. ChatDecipher
  scans the file for unambiguous dates (a value above 12) to choose day-first or
  month-first, then falls back to day-first. A file containing only ambiguous
  dates cannot be resolved with certainty without asking the user.
- **Message text:** continuation lines are joined back into the preceding
  message. Timestamped system notices are skipped rather than appended.
- **Media:** `<Media omitted>` rows count as messages; Telegram media-only rows
  without text are skipped. Vibe Check filters those placeholders out of the
  sample. Exports should still be generated without media.
- **Time zone:** metrics bucket days and months in the browser's local time zone,
  matching the way the export is read.
- **No cloud AI:** Phase 3 uses a local WebLLM model only. OCR and the optional
  premium API arrive in Phase 4/5.

## Privacy model

- Static export → no server rendering of user data, deployable anywhere.
- No analytics, no accounts, no network requests for chat content.
- Parsing, metrics, chart computation, and Vibe Check inference run entirely in
  the browser. Chat text is passed only from the page to its local Web Worker.
- The only optional network use in Phase 3 is the one-time model-weight
  download from the Hugging Face CDN. The browser caches those weights. Phase
  4/5 adds explicit, opt-in Pro generation on redacted text.
- WebGPU is required for Vibe Check. Unsupported devices get a fallback panel
  and keep every Phase 2 feature.

## Project layout

```
src/
  app/                 # routes: /, /analyzer, /wingman, /settings
  components/
    analyzer/          # dashboard + Recharts chart components
    layout/            # sidebar, top bar, mobile nav, shell
    settings/          # appearance, plan, data panels
    chat-dropzone.tsx  # export intake
    chat-library.tsx   # Dexie-backed local library + retry
    library-stats.tsx  # on-device counters
    model-loader.tsx   # WebLLM model picker, progress, Vibe Check
    theme-provider.tsx # theme context + persistence
  lib/
    db.ts              # Dexie schema + helpers (chats + message cache)
    chat-files.ts      # upload validation rules
    chat-messages.ts   # load/backfill normalized messages from Dexie
    metrics.ts         # quantitative metrics
    process-chat.ts    # parse → metrics → persist pipeline
    vibe-check.ts      # context-safe sample + prompt builder
    webllm-models.ts   # lightweight model catalog
    parsers/
      whatsapp.ts      # regex parser for .txt exports
      telegram.ts      # normalizer for .json exports
      types.ts         # shared normalized message shape
    navigation.ts      # nav config
    styles.ts          # shared class recipes
  workers/
    webllm.worker.ts   # WebGPU inference worker
scripts/
  fix-static-export-rsc.mjs  # Windows RSC path workaround
```

## Test checklist

1. `npm run dev`, open **Chat Analyzer**.
2. Import a WhatsApp `.txt` export without media. The library row should move
   from **Queued** to **Parsed**, and the dashboard should appear automatically.
3. Check the four stat cards against the conversation, then confirm the sender
   bars and activity area chart render.
4. Import a Telegram `.json` export. Its export title should become the chat
   name, and the chat picker should let you switch between imports.
5. Refresh the page: parsed metrics and charts should return without reparsing.
6. Import an invalid `.txt` to see an **Error** row with a retry action.
7. Toggle dark mode and resize to mobile width; charts and the Vibe Check card
   should re-theme and stay inside the viewport.
8. On a WebGPU-capable browser, open **Vibe Check**, pick a model, and click
   **Load … & run**. The progress bar should track the model download, then the
   Markdown response should stream into the card. Reload and run again to confirm
   the browser cached the weights.
9. Open the same page in a browser without WebGPU (or block WebGPU) and confirm
   the polite fallback appears while metrics and charts keep working.
10. With DevTools open, confirm the only network requests during a Vibe Check
    are model-weight downloads from the Hugging Face CDN. No request should carry
    chat text.
11. Open **Settings → Data & privacy** and clear the library; dashboard counters
    should return to zero and cached normalized messages should be removed.

## Docs

- [Android packaging plan](docs/android-packaging.md) — PWA-first, TWA for the
  Play Store, with the WebGPU/WebView constraints and test matrix.
