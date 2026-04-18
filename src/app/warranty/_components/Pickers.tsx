"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Shared ---------- */

function useClickOutside(
  ref: React.RefObject<HTMLDivElement | null>,
  onOutside: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOutside();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [ref, onOutside, active]);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="chev"
      viewBox="0 0 20 20"
      fill="none"
      width="14"
      height="14"
      aria-hidden
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 220ms ease",
      }}
    >
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Custom Select ---------- */

export function CustomSelect({
  id,
  name,
  label,
  options,
  required,
  placeholder = "Please select",
  colSpan,
  searchable = true,
  value,
  onChange,
}: {
  id: string;
  name?: string;
  label: string;
  options: string[];
  required?: boolean;
  placeholder?: string;
  colSpan?: string;
  searchable?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState("");
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useClickOutside(
    ref,
    () => {
      setOpen(false);
      setQuery("");
    },
    open,
  );

  const controlled = value !== undefined;
  const current = controlled ? (value as string) : internal;

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const pick = (o: string) => {
    if (!controlled) setInternal(o);
    onChange?.(o);
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={ref}
      className={`field cs ${colSpan ?? ""}`}
      data-fixed="true"
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        id={id}
        className="cs-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={current ? "cs-value" : "cs-placeholder"}>
          {current || placeholder}
        </span>
      </button>
      <input type="hidden" name={name ?? id} value={current} />
      <label htmlFor={id}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      <Chevron open={open} />
      <span className="field-bar" />

      {open && (
        <div className="cs-menu" role="listbox" aria-labelledby={id}>
          {searchable && (
            <div className="cs-search">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle
                  cx="9"
                  cy="9"
                  r="5.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="m13.5 13.5 3 3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <ul className="cs-list" role="presentation">
            {filtered.length === 0 ? (
              <li className="cs-empty">No matches</li>
            ) : (
              filtered.map((o) => {
                const selected = o === current;
                return (
                  <li key={o} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      className={`cs-option ${selected ? "is-selected" : ""}`}
                      onClick={() => pick(o)}
                    >
                      <span>{o}</span>
                      {selected && (
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          className="cs-check"
                          aria-hidden
                        >
                          <path
                            d="M2 6l2.5 2.5L10 3"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Custom Date Picker ---------- */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DatePicker({
  id,
  name,
  label,
  required,
  colSpan,
  placeholder = "Select date",
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  name?: string;
  label: string;
  required?: boolean;
  colSpan?: string;
  placeholder?: string;
  value?: Date | null;
  onChange?: (d: Date | null) => void;
  min?: Date | null;
  max?: Date | null;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<Date | null>(null);
  const [view, setView] = useState<Date>(() => new Date());
  const [panel, setPanel] = useState<"days" | "months" | "years">("days");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => { setOpen(false); setPanel("days"); }, open);

  const controlled = value !== undefined;
  const current = controlled ? (value ?? null) : internal;

  const today = new Date();
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const minD = min ? startOfDay(min) : null;
  const maxD = max ? startOfDay(max) : null;
  const isOutOfRange = (d: Date) => {
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  };

  const setValue = (d: Date | null) => {
    if (!controlled) setInternal(d);
    onChange?.(d);
  };

  const goPrev = () => {
    if (panel === "years") setView(new Date(year - 12, month, 1));
    else if (panel === "months") setView(new Date(year - 1, month, 1));
    else setView(new Date(year, month - 1, 1));
  };
  const goNext = () => {
    if (panel === "years") setView(new Date(year + 12, month, 1));
    else if (panel === "months") setView(new Date(year + 1, month, 1));
    else setView(new Date(year, month + 1, 1));
  };

  const minYear = minD ? minD.getFullYear() : 1980;
  const maxYear = maxD ? maxD.getFullYear() : today.getFullYear();
  const yearBlockStart = Math.max(minYear, year - 11);
  const yearBlock = Array.from({ length: 12 }, (_, i) => yearBlockStart + i).filter(
    (y) => y >= minYear && y <= maxYear
  );

  return (
    <div
      ref={ref}
      className={`field dp ${colSpan ?? ""}`}
      data-fixed="true"
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        id={id}
        className="cs-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open && current) setView(new Date(current));
          setOpen((o) => !o);
          setPanel("days");
        }}
      >
        <span className={current ? "cs-value" : "cs-placeholder"}>
          {current ? displayDate(current) : placeholder}
        </span>
      </button>
      <input
        type="hidden"
        name={name ?? id}
        value={current ? isoDate(current) : ""}
      />
      <label htmlFor={id}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      <svg
        className="chev"
        viewBox="0 0 20 20"
        fill="none"
        width="14"
        height="14"
        aria-hidden
      >
        <rect
          x="3.5"
          y="5"
          width="13"
          height="11.5"
          rx="0.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M3.5 8.5h13M7 3.5v3M13 3.5v3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="field-bar" />

      {open && (
        <div className="dp-menu" role="dialog" aria-label="Choose date">
          <div className="dp-header">
            <button type="button" className="dp-nav" onClick={goPrev} aria-label="Previous">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="dp-title">
              {panel === "years" ? (
                <button type="button" className="dp-title-btn" onClick={() => setPanel("days")}>
                  {yearBlock[0]}–{yearBlock[yearBlock.length - 1]}
                </button>
              ) : (
                <>
                  <button type="button" className="dp-title-btn" onClick={() => setPanel(panel === "months" ? "days" : "months")}>
                    <span className="dp-title-month">{MONTHS[month]}</span>
                  </button>
                  <button type="button" className="dp-title-btn dp-title-btn--year" onClick={() => setPanel("years")}>
                    {year}
                  </button>
                </>
              )}
            </div>
            <button type="button" className="dp-nav" onClick={goNext} aria-label="Next">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {panel === "months" && (
            <div className="dp-month-grid">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  className={`dp-month-btn ${i === month ? "is-selected" : ""}`}
                  onClick={() => { setView(new Date(year, i, 1)); setPanel("days"); }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {panel === "years" && (
            <div className="dp-year-grid">
              {yearBlock.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`dp-year-btn ${y === year ? "is-selected" : ""}`}
                  onClick={() => { setView(new Date(y, month, 1)); setPanel("months"); }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {panel === "days" && (
            <>
              <div className="dp-weekdays">
                {WEEKDAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              <div className="dp-grid">
                {cells.map((c, i) => {
                  if (c === null) return <span key={i} className="dp-cell" />;
                  const cellDate = new Date(year, month, c);
                  const isToday = sameDay(cellDate, today);
                  const isSelected = current ? sameDay(cellDate, current) : false;
                  const disabled = isOutOfRange(cellDate);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      className={`dp-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${disabled ? "is-disabled" : ""}`}
                      onClick={() => { setValue(cellDate); setOpen(false); setPanel("days"); }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="dp-foot">
            <button
              type="button"
              className="dp-foot-btn"
              disabled={isOutOfRange(startOfDay(today))}
              onClick={() => {
                if (isOutOfRange(startOfDay(today))) return;
                setValue(today);
                setView(today);
                setOpen(false);
                setPanel("days");
              }}
            >
              Today
            </button>
            {current && (
              <button
                type="button"
                className="dp-foot-btn dp-foot-btn--ghost"
                onClick={() => setValue(null)}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
