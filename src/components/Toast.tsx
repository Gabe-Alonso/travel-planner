"use client";
import { useEffect } from "react";

/**
 * A notification pinned to the bottom of the viewport so it stays visible while scrolling.
 * Auto-dismisses; give it a new `key` to show the same message again and restart the timer.
 */
export function Toast({
  message,
  onDismiss,
  tone = "error",
  duration = 5000,
}: {
  message: string;
  onDismiss: () => void;
  tone?: "error" | "info";
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`toast-in pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${
          tone === "error" ? "bg-red-50 text-red-800 ring-red-200" : "bg-brand-50 text-brand-900 ring-brand-200"
        }`}
      >
        <span aria-hidden>{tone === "error" ? "⚠️" : "✅"}</span>
        <span className="flex-1">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 rounded px-1 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
