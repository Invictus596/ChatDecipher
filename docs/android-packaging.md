# Android Packaging Plan

Status: **planning only** — no Android project has been added yet.
Scope: packaging ChatDecipher for Android without compromising the local-first,
WebGPU-based free tier.

## Recommendation

**PWA first, then a Trusted Web Activity (TWA) for the Play Store.**

- The web app stays the single codebase.
- TWA runs the app in the user's installed **Chrome**, so WebGPU, Web Workers,
  IndexedDB, and service workers behave like the desktop target.
- Android Studio is used only for the **generated TWA wrapper** (Gradle build,
  signing, Play upload), not for the Next.js app.
- **Do not** use a Capacitor/WebView shell for the free tier until Android
  WebView's WebGPU support is verified on real target devices. A WebView app
  could lose on-device AI entirely, which is the product's core promise.

## Why not the alternatives

| Option | Verdict | Reason |
| --- | --- | --- |
| **PWA (install from Chrome)** | Ship first | Zero store friction, Chrome engine, offline via service worker. No Play listing. |
| **TWA via Bubblewrap** | Ship to Play | Chrome engine, full WebGPU, small native wrapper, Play-compatible. |
| **Capacitor / WebView** | Defer | Bundles assets nicely, but Android WebView WebGPU support is less certain than Chrome; would jeopardise WebLLM. Also risks Play "webview-only app" review friction. |
| **Native Kotlin + Compose** | Not now | Duplicates the entire UI/state layer; native MLC-LLM would be a separate ML stack. Revisit only if mobile AI becomes the primary product. |

Android Studio can open the repository, but it will not build a Next.js app:
there is no Gradle project, manifest, or Android SDK target until the TWA
wrapper is generated.

## Platform facts to design around

- WebGPU is enabled by default in **Chrome 121+ on Android 12+**, initially on
  Qualcomm and ARM GPUs. Newer Chrome versions widen coverage.
- WebGPU requires a **secure context** (HTTPS; `localhost` works for dev).
- WebGPU Compatibility Mode is rolling out around Chrome 146 for older GPUs,
  including Android WebView. Do not assume WebView parity today — test it.
- WebLLM on Android is real but fragile in places: there are open reports of
  `VK_ERROR_DEVICE_LOST` on some Adreno GPUs with WebLLM 0.2.80+ (2026).
  Treat device support as a product gate, not an assumption.
- TWA needs Chrome installed and a reachable HTTPS origin with
  `.well-known/assetlinks.json`.
- A static export cannot host the Phase 4 `/api/generate-rizz` route. Premium
  cloud calls need a separate serverless deployment.

## Target architecture

```
Android phone
┌──────────────────────────────────────────────┐
│ TWA (Chrome engine, Play Store shell)        │
│  https://app.chatdecipher.example            │
│   ├─ Next.js static export (PWA)             │
│   ├─ Service worker (app shell, offline)     │
│   ├─ IndexedDB "chatdecipher"                │
│   ├─ Web Worker + WebLLM (WebGPU)            │
│   └─ Tesseract.js worker (Phase 4)           │
└───────────────┬──────────────────────────────┘
                │ only for explicit Pro actions
                ▼
     https://api.chatdecipher.example
       serverless /api/generate-rizz
       (Claude / GPT-4o, keys server-side)
```

The free tier remains 100% static and on-device. Only Phase 4 Pro requests
leave the phone, and only with redacted text.

## Work plan

### 0. Decisions (before code)

- Domain for the PWA/TWA. A custom domain is ideal; `*.pages.dev` or
  `*.vercel.app` works for asset links.
- Application ID. `com.invictus596.chatdecipher` is safe; `app.chatdecipher`
  requires owning that domain namespace.
- Google Play Console account and a signing-key strategy.
- Minimum Android: recommend **Android 12+ / Chrome 121+**, with a friendly
  capability screen on unsupported devices.
- Mobile AI policy: if a device has no usable WebGPU (or Adreno warm-up fails),
  do we (a) hide local AI, (b) offer cloud-only Pro, or (c) recommend desktop?

### 1. PWA baseline (web work, after Phase 2)

- Add `manifest.webmanifest` (**not** a dynamic route; static export friendly):
  `name`, `short_name`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`,
  `theme_color`, `background_color`, 192/512/maskable icons.
- Add apple-touch icon and Android monochrome icon.
- Add a service worker that precaches the static shell and route HTML, with a
  navigation fallback to `/` (offline).
- Add install affordance + "Add to Home Screen" instructions.
- Call `navigator.storage.persist()` after the first import; show
  `navigator.storage.estimate()` in Settings.
- Verify Android back button/history, safe-area insets (already handled in the
  mobile nav), and the system file picker for WhatsApp exports.

### 2. Hosting

- Deploy `out/` to an HTTPS static host (Cloudflare Pages or Vercel).
- Ensure the build **flattens the Windows RSC payload folders**
  (`scripts/fix-static-export-rsc.mjs` already does this).
- Verify deep links and trailing-slash routing on the host.
- Do not add server middleware; the free tier must stay static.

### 3. TWA wrapper (Bubblewrap)

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://<domain>/manifest.webmanifest
# generates ./android with a Gradle project
```

- Open the generated `android/` folder in Android Studio.
- Configure `applicationId`, version code/name, signing keystore.
- Publish `https://<domain>/.well-known/assetlinks.json` containing the
  SHA-256 fingerprint of the **Play signing key** (and upload key while testing).
- Set `fallbackType: "customtabs"` for devices without Chrome.
- Build an **AAB**, run internal testing on real phones, then closed testing.
- Keep the wrapper code out of the web app directory or in a clearly separated
  `android/` project with its own README.

### 4. WebGPU capability layer (Phase 3)

This is the most important mobile-specific engineering work:

- Detect `navigator.gpu`; request an adapter; read adapter info, limits
  (`maxBufferSize`, `maxStorageBufferBindingSize`), and `shader-f16`.
- Gate model choices by measured capability:
  - low: no local model, explain why;
  - mid: 0.5B class quantized model;
  - high: 1–1.5B class model.
  - Prefer 1k–2k context windows on phones.
- Catch `device.lost` and engine warm-up failures; never leave users on a
  frozen progress bar.
- Warn before large downloads, prefer Wi-Fi, show model + storage size, allow
  deletion.
- Do **not** collect diagnostics automatically; offer a "copy diagnostics"
  button for privacy-preserving support.
- Test WebLLM on Adreno **before** advertising mobile AI. If 0.2.8x is broken
  on a target device, pin a known-good version or disable local AI there.

### 5. Premium API split (Phase 4)

- Deploy `/api/generate-rizz` separately (Vercel Functions, Cloudflare Workers,
  or any serverless host) at an `api.` subdomain.
- Server holds provider keys; the client never sees them.
- Restrict CORS to the app origin; rate-limit by anonymous install ID.
- Only send redacted text, after local preview and explicit user action.
- Keep the static app functional if the API is offline.

### 6. Play Store readiness (Phase 5)

- Privacy policy URL; Data Safety form:
  - free tier: no data collected/transmitted;
  - Pro: redacted text sent to a cloud LLM, disclosed clearly.
- Content rating questionnaire (dating/relationship advice may raise the age
  rating).
- Screenshots/feature graphic, 512 icon, short/full description.
- Closed testing track with 12+ testers if required by the account.
- TWA is the preferred wrapper; avoid a bare WebView shell.

### 7. Android-specific UX opportunities

- **Share target**: register in the manifest so screenshots can be shared
  directly from Google Photos into Wingman Mode (`share_target` + service worker
  handler, multi-part POST). Plan for Phase 4.
- **File picker**: WhatsApp exports land in `Downloads/`; the standard file
  input works, but document the “Export chat → Without media” flow.
- **Paste from clipboard** for screenshots (already planned in Wingman).
- **Offline queue**: allow reviewing existing analyses without a network.

## Test matrix

| Device class | GPU | What to verify |
| --- | --- | --- |
| Pixel 6/7/8 | Mali | WebGPU adapter, WebLLM warm-up, IndexedDB persistence |
| Samsung S23/S24 | Adreno/Xclipse | Adreno device-lost risk, model download, OCR |
| Mid-range Snapdragon 6/7 | Adreno | Capability gating, 0.5B model, memory pressure |
| Android 12 minimum | mixed | PWA install, file picker, service worker |
| Chrome missing/old | — | Custom Tab fallback + clear upgrade message |

## Risks and mitigations

1. **Adreno WebLLM crashes** → capability gate, pinned library version, local AI
   disabled with an honest explanation, cloud fallback for Pro.
2. **Android WebView WebGPU gap** → TWA/Chrome only; no Capacitor until verified.
3. **Storage eviction** → `persist()`, storage estimates, export/backup of local
   data, model re-download flow.
4. **Play review / webview policy** → TWA with real functionality, privacy
   policy, Data Safety disclosure.
5. **Large model downloads on mobile data** → explicit consent, size labels,
   Wi-Fi preference, resumable download UX.
6. **API key leakage** → serverless-only keys, CORS, rate limits.

## Open questions

1. Which domain will host the PWA/TWA?
2. Preferred application ID?
3. Is a Play Console account already available?
4. Minimum Android version — 12+ acceptable?
5. If a phone cannot run WebLLM, should the app hide local AI, push Pro cloud
   replies, or point users to desktop?
