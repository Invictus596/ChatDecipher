"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  InitProgressReport,
  MLCEngineInterface,
} from "@mlc-ai/web-llm";
import { Icon, Spinner } from "@/components/ui/icon";
import { loadChatMessages } from "@/lib/chat-messages";
import type { ParsedChat } from "@/lib/db";
import { btnFilled, btnOutline, cardSurface, eyebrow } from "@/lib/styles";
import { cn } from "@/lib/utils";
import {
  buildVibeCheckMessages,
  buildVibeCheckSample,
  type VibeCheckSample,
} from "@/lib/vibe-check";
import {
  VIBE_CHECK_MODELS,
  getVibeCheckModel,
  type VibeCheckModelId,
} from "@/lib/webllm-models";

type SupportState = "checking" | "ready" | "unsupported";
type RunPhase = "idle" | "loading" | "generating" | "done" | "error";

type GpuLike = {
  requestAdapter: () => Promise<unknown | null>;
};

type NavigatorWithGpu = Navigator & {
  gpu?: GpuLike;
};

async function detectWebGPU(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof navigator === "undefined") {
    return { ok: false, reason: "WebGPU can only be checked in a browser." };
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      ok: false,
      reason:
        "WebGPU needs a secure context. Open the app over HTTPS or on localhost.",
    };
  }

  const gpu = (navigator as NavigatorWithGpu).gpu;
  if (!gpu || typeof gpu.requestAdapter !== "function") {
    return {
      ok: false,
      reason:
        "This browser doesn’t expose WebGPU. Try Chrome or Edge 121+ on a desktop, or a recent Android phone.",
    };
  }

  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        ok: false,
        reason:
          "WebGPU is present, but no compatible GPU adapter was found. Try closing other GPU-heavy tabs or using another browser.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason:
        "WebGPU couldn’t start on this device. Try Chrome or Edge on a desktop, or a recent Android phone.",
    };
  }
}

function isWebGPUError(message: string): boolean {
  return /webgpu|gpu adapter|requestadapter|no adapter|device lost|device is lost|out of memory|not supported/i.test(
    message,
  );
}

function humanizeError(message: string): string {
  if (/fetch|network|failed to fetch|http|download/i.test(message)) {
    return "The model weights couldn’t finish downloading. Check your connection and try again — a successful download is cached by the browser.";
  }
  if (/out of memory|device lost|buffer|allocation/i.test(message)) {
    return "The GPU ran out of memory. Close other GPU-heavy tabs, or try the smaller Llama 3.2 1B model.";
  }
  if (/context|token/i.test(message)) {
    return "This sample was too long for the model. Try a shorter chat or the other model.";
  }
  return "The local model couldn’t finish. Try again, or switch to the other model.";
}

export function ModelLoader({ chat }: { chat: ParsedChat }) {
  const [support, setSupport] = useState<SupportState>("checking");
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState<VibeCheckModelId>(
    VIBE_CHECK_MODELS[0].id,
  );
  const [loadedModel, setLoadedModel] = useState<VibeCheckModelId | null>(null);
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<VibeCheckSample | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const engineRef = useRef<MLCEngineInterface | null>(null);
  const loadedModelRef = useRef<VibeCheckModelId | null>(null);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  const selectedModelInfo = getVibeCheckModel(selectedModel);
  const modelReady = loadedModel === selectedModel;
  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const showResult = response.length > 0 || phase === "generating";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      engineRef.current?.interruptGenerate();
      workerRef.current?.terminate();
      workerRef.current = null;
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await detectWebGPU();
      if (cancelled || !mountedRef.current) return;
      setSupport(result.ok ? "ready" : "unsupported");
      setUnsupportedReason(result.reason ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    runIdRef.current += 1;
    engineRef.current?.interruptGenerate();
    setResponse("");
    setError(null);
    setSample(null);
    setProgress(0);
    setProgressText("");
    setPhase("idle");
  }, [chat.id, chat.parsedAt]);

  function disposeEngine() {
    workerRef.current?.terminate();
    workerRef.current = null;
    engineRef.current = null;
    loadedModelRef.current = null;
    setLoadedModel(null);
  }

  function cancelRun() {
    runIdRef.current += 1;
    engineRef.current?.interruptGenerate();
    disposeEngine();
    setPhase("idle");
    setProgress(0);
    setProgressText("");
    setResponse("");
    setError(null);
    setSample(null);
  }

  function chooseModel(modelId: VibeCheckModelId) {
    if (modelId === selectedModel) return;
    setSelectedModel(modelId);
    setError(null);
    if (phase === "done" || phase === "error") {
      setResponse("");
      setSample(null);
      setPhase("idle");
    }
  }

  async function analyze() {
    if (phase === "loading" || phase === "generating") return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setError(null);
    setResponse("");
    setSample(null);
    setPhase("loading");
    setProgress(0);
    setProgressText("Checking WebGPU…");

    try {
      if (support !== "ready") {
        const supportResult = await detectWebGPU();
        if (runId !== runIdRef.current) return;
        if (!supportResult.ok) {
          setSupport("unsupported");
          setUnsupportedReason(supportResult.reason ?? null);
          setPhase("idle");
          return;
        }
        setSupport("ready");
        setUnsupportedReason(null);
      }

      setProgressText("Loading parsed messages from this browser…");
      const messages = await loadChatMessages(chat.id);
      if (runId !== runIdRef.current) return;

      const nextSample = buildVibeCheckSample(messages, chat.contactName);
      if (nextSample.sampledMessages < 2) {
        setError(
          "This chat doesn’t have enough readable text for a Vibe Check yet. Import a longer export or pick another chat.",
        );
        setPhase("error");
        return;
      }

      setSample(nextSample);
      const prompt = buildVibeCheckMessages(nextSample);

      let engine = engineRef.current;
      if (!engine || loadedModelRef.current !== selectedModel) {
        disposeEngine();
        setProgress(0);
        setProgressText("Starting the local AI worker…");

        const worker = new Worker(
          new URL("../workers/webllm.worker.ts", import.meta.url),
          { type: "module" },
        );
        workerRef.current = worker;

        worker.addEventListener("error", () => {
          if (runId !== runIdRef.current || !mountedRef.current) return;
          setError(
            "The local AI worker stopped unexpectedly. Try again, or reload the page if it keeps happening.",
          );
          setPhase("error");
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
          if (engineRef.current) {
            engineRef.current = null;
            loadedModelRef.current = null;
            setLoadedModel(null);
          }
        });

        const webllm = await import("@mlc-ai/web-llm");
        if (runId !== runIdRef.current || workerRef.current !== worker) {
          worker.terminate();
          return;
        }

        engine = await webllm.CreateWebWorkerMLCEngine(worker, selectedModel, {
          initProgressCallback: (report: InitProgressReport) => {
            if (runId !== runIdRef.current || !mountedRef.current) return;
            setProgress(Math.max(0, Math.min(1, report.progress)));
            setProgressText(report.text);
          },
        });

        if (runId !== runIdRef.current || workerRef.current !== worker) {
          worker.terminate();
          return;
        }

        engineRef.current = engine;
        loadedModelRef.current = selectedModel;
        setLoadedModel(selectedModel);
        setProgress(1);
        setProgressText("Model ready");
      }

      setPhase("generating");
      setProgressText("");

      await engine.resetChat();
      if (runId !== runIdRef.current) return;

      const stream = await engine.chat.completions.create({
        messages: prompt,
        stream: true,
        temperature: 0.65,
        max_tokens: 700,
      });

      let text = "";
      for await (const chunk of stream) {
        if (runId !== runIdRef.current) return;
        const delta = chunk.choices[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          text += delta;
          setResponse(text);
        }
      }

      if (runId !== runIdRef.current) return;
      if (text.trim().length === 0) {
        setError(
          "The model finished without producing text. Try again or choose the other model.",
        );
        setPhase("error");
        return;
      }

      setPhase("done");
    } catch (caught) {
      if (runId !== runIdRef.current) return;
      const message = caught instanceof Error ? caught.message : String(caught);

      if (isWebGPUError(message)) {
        disposeEngine();
        setSupport("unsupported");
        setUnsupportedReason(
          "WebGPU could not start on this device. Try Chrome or Edge on a desktop, or close other GPU-heavy tabs and retry.",
        );
        setPhase("idle");
        return;
      }

      setError(humanizeError(message));
      setPhase("error");
    }
  }

  return (
    <section
      className={cn(cardSurface, "relative overflow-hidden p-5 sm:p-6")}
      aria-labelledby="vibe-check-heading"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-tertiary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-tertiary-container text-on-tertiary-container">
              <Icon name="sparkles" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className={eyebrow}>Phase 3 · Local AI</p>
              <h3
                id="vibe-check-heading"
                className="mt-1 font-display text-xl font-semibold tracking-[-0.025em]"
              >
                Vibe Check
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-on-surface-variant">
                A small language model reads a sample of this chat and writes a
                Markdown read on tone, topics, and dynamics. Inference runs in a
                Web Worker with WebGPU — chat text never leaves this tab.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary-container/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-on-secondary-container">
              <Icon name="shield" className="size-3.5" />
              On-device
            </span>
            {support === "checking" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container-high/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                <Spinner className="size-3.5" />
                Checking WebGPU
              </span>
            ) : null}
            {modelReady ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-container/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-on-primary-container">
                <Icon name="check" className="size-3.5" />
                Model ready
              </span>
            ) : null}
          </div>
        </div>

        {support === "unsupported" ? (
          <div className="mt-5 rounded-[22px] border border-tertiary/25 bg-tertiary-container/30 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-surface-container-lowest/60 text-tertiary">
                <Icon name="alert" className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  WebGPU isn’t available here
                </p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {unsupportedReason ??
                    "Vibe Check needs WebGPU to run a model locally. Try Chrome or Edge on a desktop, or a recent Android phone."}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant/80">
                  Your Phase 2 metrics, charts, and local library still work
                  entirely on-device.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {phase !== "loading" && phase !== "generating" ? (
              <div
                className="mt-5 grid gap-2.5 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Choose a local model"
              >
                {VIBE_CHECK_MODELS.map((model) => {
                  const active = selectedModel === model.id;
                  const isLoaded = loadedModel === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => chooseModel(model.id)}
                      className={cn(
                        "group flex items-start gap-3 rounded-[20px] border p-3.5 text-left transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98]",
                        active
                          ? "border-primary/40 bg-primary-container/45 shadow-[var(--elevation-1)]"
                          : "border-outline-variant/60 bg-surface-container-lowest/50 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface-container-high/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-[12px]",
                          active
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant",
                        )}
                      >
                        <Icon
                          name={model.badge === "Fastest" ? "cpu" : "sparkles"}
                          className="size-[17px]"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-on-surface">
                            {model.name}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
                              active
                                ? "bg-primary text-on-primary"
                                : "bg-surface-container-high text-on-surface-variant",
                            )}
                          >
                            {isLoaded ? "Loaded" : model.badge}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-on-surface-variant">
                          {model.description}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-on-surface-variant/80">
                          {model.download} download · {model.memory}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {phase === "loading" ? (
              <div className="mt-5 rounded-[22px] border border-primary/25 bg-primary-container/25 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Spinner className="size-4 text-primary" />
                    <p className="text-xs font-semibold text-on-primary-container">
                      Loading {selectedModelInfo.name}…
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-on-primary-container/80">
                    {percent}%
                  </span>
                </div>

                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container-lowest/60"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label="Model download progress"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p
                  className="mt-2 line-clamp-2 min-h-5 text-[10px] leading-relaxed text-on-primary-container/75"
                  aria-live="polite"
                >
                  {progressText || "Preparing the local model…"}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-md text-[10px] leading-relaxed text-on-primary-container/65">
                    First run downloads model weights once; the browser caches
                    them. Keep this tab open.
                  </p>
                  <button
                    type="button"
                    onClick={cancelRun}
                    className={cn(
                      btnOutline,
                      "border-primary/25 bg-surface-container-lowest/40 px-3.5 py-2 text-[11px] text-on-primary-container",
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {phase === "error" && error ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-[20px] border border-error/30 bg-error-container/30 p-4"
              >
                <Icon
                  name="alert"
                  className="mt-0.5 size-4 shrink-0 text-error"
                />
                <div>
                  <p className="text-xs font-semibold text-on-error-container">
                    The local model hit a snag
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-on-error-container/80">
                    {error}
                  </p>
                </div>
              </div>
            ) : null}

            {showResult ? (
              <div className="mt-5 rounded-[24px] border border-outline-variant/50 bg-surface-container-lowest/65 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    Vibe Check
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-surface-container-high px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                      {selectedModelInfo.name}
                    </span>
                    <span className="rounded-full bg-secondary-container/55 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-on-secondary-container">
                      {phase === "generating" ? "Generating" : "On-device"}
                    </span>
                  </div>
                </div>

                <div className="vibe-markdown mt-3" aria-live="polite">
                  {response ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {response}
                    </ReactMarkdown>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Spinner className="size-3.5" />
                      Reading the room…
                    </p>
                  )}
                  {phase === "generating" && response ? (
                    <span
                      className="mt-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary align-middle"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <p className="mt-4 border-t border-outline-variant/40 pt-3 text-[10px] leading-relaxed text-on-surface-variant/80">
                  Generated locally by {selectedModelInfo.name}. Small models
                  can be confidently wrong — treat this as a prompt, not a
                  verdict.
                </p>
              </div>
            ) : null}

            {phase !== "loading" && phase !== "generating" ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void analyze()}
                  disabled={support !== "ready"}
                  className={btnFilled}
                >
                  {support === "checking" ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Icon name="sparkles" className="size-4" />
                  )}
                  {support === "checking"
                    ? "Checking WebGPU…"
                    : phase === "done"
                      ? "Regenerate"
                      : phase === "error"
                        ? "Try again"
                        : modelReady
                          ? "Run Vibe Check"
                          : `Load ${selectedModelInfo.name} & run`}
                </button>

                {phase === "done" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResponse("");
                      setSample(null);
                      setPhase("idle");
                    }}
                    className={btnOutline}
                  >
                    Change model
                  </button>
                ) : null}

                <p className="max-w-md text-[10px] leading-relaxed text-on-surface-variant/80">
                  {sample
                    ? `Sampled ${sample.sampledMessages} of ${sample.totalMessages} messages. `
                    : ""}
                  First run downloads the model once. Only this chat’s sample is
                  passed to the local worker.
                </p>
              </div>
            ) : null}

            {phase === "generating" ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={cancelRun} className={btnOutline}>
                  <Icon name="close" className="size-4" />
                  Stop
                </button>
                <p className="text-[10px] leading-relaxed text-on-surface-variant/80">
                  Generating locally with {selectedModelInfo.name}. You can stop
                  at any time.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
