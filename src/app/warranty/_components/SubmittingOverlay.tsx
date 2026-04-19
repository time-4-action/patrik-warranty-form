"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type SubmitStage = {
  key: string;
  label: string;
  status: "pending" | "active" | "done";
};

export function SubmittingOverlay({
  stages,
  submissionId,
}: {
  stages: SubmitStage[];
  submissionId: string | null;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (typeof document === "undefined") return null;

  const total = stages.length;
  const doneCount = stages.filter((s) => s.status === "done").length;
  const active = stages.find((s) => s.status === "active");
  const allDone = total > 0 && doneCount === total;

  const message = allDone
    ? "All set — finalizing…"
    : active
      ? messageFor(active.key)
      : "Preparing your warranty…";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Submitting warranty request"
    >
      <div className="relative w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          <span className="proc-spinner" aria-hidden />
        </div>

        <h3 className="font-display text-[22px] font-bold uppercase tracking-[0.18em] text-cyan">
          Processing warranty
        </h3>

        <p className="mt-3 text-[14px] leading-relaxed text-ink-2" aria-live="polite">
          {message}
        </p>

        {total > 0 && (
          <p className="mt-4 text-[12px] text-mute">
            Step <span className="font-semibold text-ink">{Math.min(doneCount + (active ? 1 : 0), total)}</span> of{" "}
            <span className="font-semibold text-ink">{total}</span>
          </p>
        )}

        {total > 0 && (
          <div className="mx-auto mt-3 h-[3px] w-40 overflow-hidden rounded-full bg-rule">
            <div
              className="h-full rounded-full bg-cyan transition-[width] duration-500 ease-out"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        )}

        <p className="mt-6 text-[11px] text-mute">
          Please keep this window open — do not refresh.
        </p>

        {submissionId && (
          <p className="mt-2 text-[10px] text-mute">
            Ref: <code className="font-mono">{submissionId.slice(0, 8)}</code>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function messageFor(key: string): string {
  switch (key) {
    case "invoice":
      return "Uploading your invoice…";
    case "serial":
      return "Uploading the serial number photo…";
    case "full":
      return "Uploading the full product photo…";
    case "closeup":
      return "Uploading the closeup photo…";
    case "record":
      return "Logging your warranty request…";
    default:
      return "Working on it…";
  }
}
