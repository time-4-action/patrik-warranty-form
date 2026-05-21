"use client";

import { useEffect, useId, useRef, useState } from "react";

export function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      className="info-tip"
      ref={wrapRef}
      data-open={open ? "true" : undefined}
    >
      <button
        type="button"
        className="info-tip-btn"
        aria-label={`More info about ${label}`}
        aria-expanded={open}
        aria-controls={popId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <svg viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="3.1" r="0.9" fill="currentColor" />
          <rect
            x="5.1"
            y="5.1"
            width="1.8"
            height="4.7"
            rx="0.9"
            fill="currentColor"
          />
        </svg>
      </button>
      {open && (
        <span id={popId} role="tooltip" className="info-tip-pop">
          <span className="info-tip-arrow" aria-hidden />
          <span className="info-tip-pop-body">{text}</span>
        </span>
      )}
    </span>
  );
}
