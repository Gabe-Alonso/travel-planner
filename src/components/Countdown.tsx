"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNow } from "./useClient";

export function Countdown({ deadline }: { deadline: string }) {
  const now = useNow();
  const router = useRouter();
  const end = new Date(deadline).getTime();
  const remaining = now === null ? null : Math.max(0, end - now);
  const refreshed = useRef(false);

  useEffect(() => {
    if (remaining === 0 && !refreshed.current) {
      refreshed.current = true;
      // Let the server lock in the result
      router.refresh();
    }
  }, [remaining, router]);

  if (remaining === null) return <span className="tabular-nums opacity-0">00d 00h 00m 00s</span>;

  const s = Math.floor(remaining / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: "days" },
    { v: Math.floor((s % 86400) / 3600), l: "hrs" },
    { v: Math.floor((s % 3600) / 60), l: "min" },
    { v: s % 60, l: "sec" },
  ];
  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="min-w-14 rounded-xl bg-white/15 px-2 py-1.5 text-center backdrop-blur">
          <div className="text-2xl font-bold tabular-nums leading-none">{String(p.v).padStart(2, "0")}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider opacity-80">{p.l}</div>
        </div>
      ))}
    </div>
  );
}
