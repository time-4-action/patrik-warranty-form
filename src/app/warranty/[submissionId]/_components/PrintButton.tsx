"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-pill"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        aria-hidden
      >
        <path d="M6 9V4h12v5" />
        <rect x="4" y="9" width="16" height="9" rx="1" />
        <path d="M7 14h10v6H7z" />
      </svg>
      Print / Save as PDF
    </button>
  );
}
