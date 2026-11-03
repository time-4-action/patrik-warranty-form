"use client";

// Maintenance notices for customers, set from Slack with `/maintenance announce ... for warranty`
// or at maintenance.time-4-action.com/admin (time-4-action/t4a-maintenance). Only maintenances that
// name the warranty form reach it; the internal ones for every t4a app don't. Reads banner.json
// every minute and shows one strip per maintenance above the page, most urgent first, at most
// three: amber while planned, red while it runs. Nothing when none is on or the file can't be read.

import { useEffect, useState } from "react";

const BANNER_URL = "https://maintenance.time-4-action.com/banner.json?app=warranty";
const POLL_MS = 60_000;
const MAX_ITEMS = 3;

type Item = { id: number | string; level: "planned" | "now" | "down"; text: string };

export function MaintenanceBanner() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(BANNER_URL)
        .then((r) => (r.ok ? (r.json() as Promise<{ items?: Item[] }>) : null))
        .then((b) => alive && setItems(Array.isArray(b?.items) ? b.items.filter((i) => i?.text).slice(0, MAX_ITEMS) : []))
        .catch(() => alive && setItems([]));
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!items.length) return null;
  return (
    <div role="status" className="shrink-0">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center justify-center gap-3 border-b px-6 py-2.5 text-center text-[13px] ${
            item.level === "planned"
              ? "border-amber-300/60 bg-amber-100 text-amber-900"
              : "border-red-300/60 bg-red-100 text-red-900"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span className="min-w-0">{item.text}</span>
        </div>
      ))}
    </div>
  );
}
