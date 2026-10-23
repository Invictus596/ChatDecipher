"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, Spinner } from "@/components/ui/icon";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  contactNameFromFile,
  validateChatFile,
} from "@/lib/chat-files";
import { getDb } from "@/lib/db";
import { btnFilled } from "@/lib/styles";
import { createId, cn, pluralize } from "@/lib/utils";

type Feedback = {
  tone: "success" | "error";
  title: string;
  details?: string[];
};

type Progress = { current: number; total: number };

export function ChatDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Dropping a file anywhere else would navigate away and discard app state.
  useEffect(() => {
    const preventNavigation = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", preventNavigation);
    window.addEventListener("drop", preventNavigation);
    return () => {
      window.removeEventListener("dragover", preventNavigation);
      window.removeEventListener("drop", preventNavigation);
    };
  }, []);

  const importFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;

    setIsImporting(true);
    setFeedback(null);
    setProgress({ current: 0, total: fileList.length });

    const saved: string[] = [];
    const rejected: string[] = [];

    for (const [index, file] of fileList.entries()) {
      setProgress({ current: index + 1, total: fileList.length });

      const validation = validateChatFile(file);
      if (!validation.ok) {
        rejected.push(`${file.name}: ${validation.reason}`);
        continue;
      }

      try {
        const text = await file.text();
        const platform = validation.platform;

        await getDb().parsedChats.add({
          id: createId(platform),
          platform,
          contactName: contactNameFromFile(file.name),
          // The Phase 2 parser fills this in. Until then the export is safely
          // persisted and visible in the local library.
          messageCount: 0,
          rawChunks: [text],
          timestamp: Date.now() + index,
        });

        saved.push(file.name);
      } catch {
        rejected.push(`${file.name}: Could not be read or stored locally.`);
      }
    }

    setIsImporting(false);
    setProgress(null);

    if (saved.length > 0 && rejected.length === 0) {
      setFeedback({
        tone: "success",
        title: `${pluralize(saved.length, "export")} saved to this device`,
        details: [
          "Stored in IndexedDB — nothing left your browser. Sender and message analysis arrives in Phase 2.",
        ],
      });
    } else if (saved.length > 0) {
      setFeedback({
        tone: "error",
        title: `Saved ${pluralize(saved.length, "export")}, skipped ${rejected.length}`,
        details: rejected,
      });
    } else {
      setFeedback({
        tone: "error",
        title: "No files were imported",
        details: rejected,
      });
    }
  }, []);

  const openPicker = () => {
    if (isImporting) return;
    inputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload WhatsApp or Telegram chat exports"
        aria-disabled={isImporting}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        className={cn(
          "group relative overflow-hidden rounded-[32px] border-2 border-dashed px-6 py-10 text-center outline-none sm:px-10 sm:py-14",
          "transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDragging
            ? "scale-[1.01] border-primary bg-primary-container/45 shadow-[var(--elevation-3)]"
            : "border-outline-variant/80 bg-surface-container-low/55 hover:border-primary/40 hover:bg-surface-container-low",
          isImporting && "cursor-progress",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b transition-opacity duration-500",
            isDragging
              ? "from-primary-container/60 opacity-100"
              : "from-surface-container-high/40 opacity-60",
          )}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-tertiary/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center">
          <div
            className={cn(
              "grid size-20 place-items-center rounded-[26px] border border-outline-variant/50 bg-surface-container-lowest text-primary elevation-2",
              "transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              isDragging
                ? "-translate-y-1.5 scale-110"
                : "animate-float group-hover:-translate-y-1",
            )}
          >
            {isImporting ? (
              <Spinner className="size-8" />
            ) : (
              <Icon name="upload" className="size-8" strokeWidth={1.7} />
            )}
          </div>

          <h3 className="mt-6 font-display text-xl font-semibold tracking-[-0.015em] sm:text-2xl">
            {isImporting ? "Saving to your device…" : "Drop your chat export here"}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
            WhatsApp <span className="font-semibold text-on-surface">.txt</span>{" "}
            exports and Telegram{" "}
            <span className="font-semibold text-on-surface">.json</span> exports.
            Up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB per file.
          </p>

          <span className={cn(btnFilled, "mt-6 pointer-events-none")}>
            <Icon name="plus" className="size-4" />
            Browse files
          </span>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-lowest/70 px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant">
              <Icon name="chat" className="size-3.5 text-secondary" />
              WhatsApp chat
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-lowest/70 px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant">
              <Icon name="braces" className="size-3.5 text-primary" />
              Telegram export
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary-container/40 px-3 py-1.5 text-[11px] font-semibold text-on-secondary-container">
              <Icon name="lock" className="size-3.5" />
              Stays on-device
            </span>
          </div>
        </div>

        {isImporting ? (
          <div className="absolute inset-x-6 bottom-4 sm:inset-x-10">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{
                  width: progress
                    ? `${Math.round((progress.current / progress.total) * 100)}%`
                    : "15%",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-on-surface-variant">
              {progress
                ? `Processing ${progress.current} of ${progress.total}`
                : "Preparing…"}
            </p>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          multiple
          className="sr-only"
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void importFiles(files);
          }}
        />
      </div>

      <div aria-live="polite" className="min-h-0">
        {feedback ? (
          <div
            role="status"
            className={cn(
              "mt-4 flex animate-fade-up items-start gap-3 rounded-[20px] border p-4",
              feedback.tone === "success"
                ? "border-secondary/30 bg-secondary-container/35"
                : "border-error/30 bg-error-container/30",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                feedback.tone === "success"
                  ? "bg-secondary text-on-secondary"
                  : "bg-error text-on-error",
              )}
            >
              <Icon
                name={feedback.tone === "success" ? "check" : "alert"}
                className="size-4"
                strokeWidth={2.4}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  feedback.tone === "success"
                    ? "text-on-secondary-container"
                    : "text-on-error-container",
                )}
              >
                {feedback.title}
              </p>
              {feedback.details?.map((detail) => (
                <p
                  key={detail}
                  className={cn(
                    "mt-1 text-xs leading-relaxed",
                    feedback.tone === "success"
                      ? "text-on-secondary-container/80"
                      : "text-on-error-container/85",
                  )}
                >
                  {detail}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setFeedback(null);
              }}
              className="-m-1 grid size-8 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Dismiss message"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
