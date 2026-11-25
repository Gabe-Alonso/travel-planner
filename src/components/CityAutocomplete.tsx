"use client";
import { useEffect, useId, useRef, useState } from "react";

export type CityResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  population?: number;
};

function flag(cc?: string) {
  if (!cc || cc.length !== 2) return "📍";
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function CityAutocomplete({
  onSelect,
  disabled,
  placeholder = "Start typing a city…",
}: {
  onSelect: (city: CityResult) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
          { signal: ctrl.signal },
        );
        const json = await res.json();
        setResults(json.results ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        // aborted or offline
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = query.trim().length >= 2 ? results : [];

  function choose(city: CityResult) {
    onSelect(city);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">🔎</span>
        <input
          className="input pl-9"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => shown.length && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !shown.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % shown.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + shown.length) % shown.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(shown[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading && (
          <span className="absolute inset-y-0 right-3 flex items-center text-xs text-stone-400">searching…</span>
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {shown.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-stone-500">No matching cities</li>
          )}
          {shown.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                i === active ? "bg-brand-50" : ""
              }`}
            >
              <span className="text-lg">{flag(c.country_code)}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium text-stone-900">{c.name}</span>
                <span className="block truncate text-xs text-stone-500">
                  {[c.admin1, c.country].filter(Boolean).join(", ")}
                </span>
              </span>
              {c.population ? (
                <span className="text-xs text-stone-400">{Intl.NumberFormat("en", { notation: "compact" }).format(c.population)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
