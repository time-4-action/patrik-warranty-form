"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_URL = "https://api.time-4-action.com/api/product/search";
const CAT = "69e3533f083b11005a8f6ab1";

interface ProductResult {
    code: string;
    ean_code: string;
    product_name: string;
    image: string | null;
    category?: string;
}

interface Suggestion {
    name: string;
    category: string;
}

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

export function ProductNameAutocomplete({
    id,
    label,
    required,
    colSpan,
    value,
    onChange,
    onCategoryChange,
}: {
    id: string;
    label: string;
    required?: boolean;
    colSpan?: string;
    value?: string;
    onChange?: (v: string) => void;
    onCategoryChange?: (category: string) => void;
}) {
    const [inputValue, setInputValue] = useState(value ?? "");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const close = useCallback(() => {
        setOpen(false);
        setSuggestions([]);
        setActiveIndex(-1);
    }, []);

    useClickOutside(ref, close, open);

    const fetchSuggestions = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({ q, cat: CAT });
            const res = await fetch(`${SEARCH_URL}?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success) return;
            const seen = new Set<string>();
            const unique: Suggestion[] = [];
            for (const p of data.data as ProductResult[]) {
                if (!seen.has(p.product_name)) {
                    seen.add(p.product_name);
                    unique.push({ name: p.product_name, category: p.category ?? "" });
                }
            }
            setSuggestions(unique);
            setOpen(unique.length > 0);
        } catch {
            // API unavailable — field continues as plain text input
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInput = (v: string) => {
        setInputValue(v);
        onChange?.(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
    };

    const handleSelect = (s: Suggestion) => {
        setInputValue(s.name);
        onChange?.(s.name);
        if (s.category) onCategoryChange?.(s.category);
        close();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[activeIndex]!);
        }
    };

    const controlled = value !== undefined;
    const displayValue = controlled ? value : inputValue;

    return (
        <div ref={ref} className={`field ac-wrap ${colSpan ?? ""}`} data-open={open ? "true" : "false"}>
            <input
                id={id}
                name={id}
                type="text"
                autoComplete="off"
                placeholder=" "
                value={displayValue}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={`${id}-listbox`}
                role="combobox"
                aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
            />
            <label htmlFor={id}>
                {label}
                {required && <span className="req">*</span>}
            </label>
            <span className="field-bar" />

            {loading && <span className="ac-spinner" aria-hidden />}

            {open && suggestions.length > 0 && (
                <ul
                    id={`${id}-listbox`}
                    className="cs-menu cs-list ac-list"
                    role="listbox"
                    aria-label={label}
                >
                    {suggestions.map((s, i) => (
                        <li
                            key={s.name}
                            id={`${id}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                        >
                            <button
                                type="button"
                                className={`cs-option ${i === activeIndex ? "is-selected" : ""}`}
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => handleSelect(s)}
                            >
                                <span className="ac-name">{s.name}</span>
                                {s.category && <span className="ac-sub">{s.category}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
