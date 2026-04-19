"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  limit: number;
  retryAfterSeconds: number;
  onClose: () => void;
};

function formatRemaining(secs: number): string {
  if (secs <= 0) return "now";
  if (secs < 60) return `${secs} second${secs === 1 ? "" : "s"}`;
  const mins = Math.ceil(secs / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

export function RateLimitModal({ limit, retryAfterSeconds, onClose }: Props) {
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-limit-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl bg-white text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="h-1 w-full bg-gradient-to-r from-cyan/30 via-cyan to-cyan/30"
        />
        <div className="px-8 pt-8 pb-7">
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-cyan/10"
            />
            <span
              aria-hidden
              className="absolute inset-1 rounded-full bg-cyan/15"
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="relative h-9 w-9 text-cyan"
              aria-hidden
            >
              <path
                d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M12 9v3.2l2 1.3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h3
            id="rate-limit-title"
            className="font-display text-[22px] font-bold uppercase tracking-[0.18em] text-cyan"
          >
            Take a short break
          </h3>

          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            To protect our warranty team from automated abuse, submissions are
            limited to{" "}
            <strong className="font-semibold text-ink">{limit} per hour</strong>{" "}
            from the same network.
          </p>

          <div className="mt-5 rounded-lg border border-rule bg-[color-mix(in_oklab,var(--cyan)_6%,white)] px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">
              You can try again in
            </p>
            <p className="mt-1 font-display text-[24px] font-bold text-cyan tabular-nums">
              {formatRemaining(remaining)}
            </p>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-mute">
            Already sent your warranty? No need to resubmit — we received it and
            you&rsquo;ll get a confirmation email shortly. If something looks
            wrong, email{" "}
            <a
              href="mailto:info@patrik-windsurf.com"
              className="text-cyan-3 underline-offset-2 hover:underline"
            >
              info@patrik-windsurf.com
            </a>
            .
          </p>

          <button
            type="button"
            className="btn-send mt-6 mx-auto"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
