"use client";
import { useSyncExternalStore } from "react";
import { getThemePref, setThemePref, subscribeThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

export function ThemeToggle() {
  // Server render has no access to localStorage, so it shows nothing selected until hydration.
  const pref = useSyncExternalStore<ThemePref | null>(subscribeThemePref, getThemePref, () => null);

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-xl bg-stone-100 p-1">
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setThemePref(o.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <span aria-hidden>{o.icon}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
