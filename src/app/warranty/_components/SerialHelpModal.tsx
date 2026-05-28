"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

type TabKey = "boom" | "sail" | "other";

type SerialExample = {
  key: TabKey;
  label: string;
  caption: string;
  // Photo + locator pin — omitted for the "other" tab, which is text-only.
  src?: string;
  example?: string;
  pin?: { x: string; y: string };
};

const EXAMPLES: SerialExample[] = [
  {
    key: "boom",
    label: "Boom",
    src: "/serial-examples/boom-serial-number.webp",
    caption:
      "Engraved on the boom head, near the front clamp — letters followed by digits.",
    example: "BCB400602",
    pin: { x: "40%", y: "52%" },
  },
  {
    key: "sail",
    label: "Sail",
    src: "/serial-examples/sail-serial-number.webp",
    caption:
      "On a small printed label near the tack — the bottom front corner, by the mast sleeve.",
    example: "PA210681",
    pin: { x: "72%", y: "55%" },
  },
  {
    key: "other",
    label: "Other",
    caption:
      "For most products it's easy to spot. On boards it's printed on the deck near the tail (the back). On other gear, look for a visible label, sticker, or stamp showing a code of letters and numbers. Still stuck? Submit your best guess and our team will help.",
  },
];

// Maps the chosen product category to the most relevant example tab.
export function defaultSerialTab(category: string): TabKey {
  if (category === "Sail") return "sail";
  // Boom is the default — the most common case and a clear example.
  return "boom";
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function SerialHelpModal({
  defaultTab = "boom",
  origin,
  onClose,
}: {
  defaultTab?: TabKey;
  origin?: { x: number; y: number };
  onClose: () => void;
}) {
  const [active, setActive] = useState<TabKey>(defaultTab);
  const [zoomed, setZoomed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // Delta from the click origin to the (centered) resting position.
  const offset = useCallback(() => {
    if (!origin) return { dx: 0, dy: 0 };
    return {
      dx: origin.x - window.innerWidth / 2,
      dy: origin.y - window.innerHeight / 2,
    };
  }, [origin]);

  // Animate out, then unmount.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const card = cardRef.current;
    const backdrop = backdropRef.current;
    if (!card || prefersReducedMotion()) {
      onClose();
      return;
    }
    const { dx, dy } = offset();
    backdrop?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      easing: "ease-in",
      fill: "forwards",
    });
    const anim = card.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.12)`,
          opacity: 0,
        },
      ],
      { duration: 200, easing: "ease-in", fill: "forwards" },
    );
    anim.onfinish = onClose;
  }, [offset, onClose]);

  // Entrance: grow from the click origin.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    const { dx, dy } = offset();
    card.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.12)`,
          opacity: 0.2,
        },
        { transform: "translate(0,0) scale(1)", opacity: 1 },
      ],
      { duration: 320, easing: EASE },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [requestClose]);

  if (typeof document === "undefined") return null;

  const current = EXAMPLES.find((e) => e.key === active) ?? EXAMPLES[0];

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="serial-help-title"
    >
      <div
        ref={cardRef}
        className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur transition-colors hover:bg-white"
          aria-label="Close"
          onClick={requestClose}
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Banner — zoomable photo, or a text-only panel for "Other" */}
        {current.src && current.pin ? (
          <button
            type="button"
            className={`group relative aspect-[4/3] w-full overflow-hidden bg-ink ${
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
            }`}
            aria-label={zoomed ? "Zoom out" : "Zoom into the serial number"}
            onClick={() => setZoomed((z) => !z)}
          >
            <Image
              key={current.src}
              src={current.src}
              alt={`Serial number location on a PATRIK ${current.label.toLowerCase()}`}
              fill
              sizes="(max-width: 420px) 100vw, 384px"
              className="object-cover transition-transform duration-500 ease-out"
              style={{
                transformOrigin: `${current.pin.x} ${current.pin.y}`,
                transform: zoomed ? "scale(2.4)" : "scale(1)",
              }}
              priority
            />

            {/* gradient scrim for legibility */}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent transition-opacity duration-300 ${
                zoomed ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden
            />

            {/* pulsing locator */}
            <span
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
                zoomed ? "opacity-0" : "opacity-100"
              }`}
              style={{ left: current.pin.x, top: current.pin.y }}
              aria-hidden
            >
              <span className="serial-pin-ring absolute left-1/2 top-1/2 h-7 w-7 rounded-full border-2 border-cyan" />
              <span className="block h-3 w-3 rounded-full border-2 border-white bg-cyan shadow" />
            </span>

            {/* hint */}
            <span
              className={`pointer-events-none absolute bottom-3 left-4 right-4 flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.28em] text-white/90 transition-opacity duration-300 ${
                zoomed ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10.5 10.5L14 14M7 5v4M5 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Tap to zoom
            </span>
          </button>
        ) : (
          <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1e3b44] to-ink px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-cyan">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M8.5 11h5M11 8.5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <p className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-white">
              Usually in plain sight
            </p>
            <p className="text-[12px] leading-relaxed text-white/70">
              A code of letters and numbers, printed or stamped on the product.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
          <div>
            <h3
              id="serial-help-title"
              className="font-display text-[16px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              Finding your serial number
            </h3>
            <p className="mt-1 text-[12px] text-mute">
              Pick your product type to see where it&apos;s located.
            </p>
          </div>

          {/* Segmented control */}
          <div
            className="inline-flex w-full rounded-full bg-bg-2 p-1"
            role="tablist"
            aria-label="Product type"
          >
            {EXAMPLES.map((ex) => {
              const selected = ex.key === active;
              return (
                <button
                  key={ex.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`flex-1 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all ${
                    selected
                      ? "bg-white text-cyan shadow-sm"
                      : "text-mute hover:text-ink-2"
                  }`}
                  onClick={() => {
                    setActive(ex.key);
                    setZoomed(false);
                  }}
                >
                  {ex.label}
                </button>
              );
            })}
          </div>

          <p className="text-[13.5px] leading-relaxed text-ink-2">
            {current.caption}
          </p>

          {current.example && (
            <div className="flex items-center justify-between rounded-lg border border-rule bg-bg-2 px-3 py-2.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-mute">
                Example
              </span>
              <code className="font-mono text-[13px] font-medium text-ink">
                {current.example}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
