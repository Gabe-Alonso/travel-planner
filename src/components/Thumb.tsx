/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";

const GRADIENTS = [
  "from-sky-400 to-indigo-500",
  "from-amber-300 to-rose-500",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-400 to-purple-600",
  "from-orange-300 to-red-500",
  "from-cyan-300 to-blue-600",
];

/** Image with a friendly gradient fallback if missing or broken. */
export function Thumb({
  src,
  label,
  className = "",
}: {
  src: string | null | undefined;
  label: string;
  className?: string;
}) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = !!src && brokenSrc === src;
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={label}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBrokenSrc(src)}
        className={`object-cover ${className}`}
      />
    );
  }
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${GRADIENTS[h % GRADIENTS.length]} ${className}`}
      aria-label={label}
    >
      <span className="text-3xl font-bold text-white/90 drop-shadow">{label.trim()[0]?.toUpperCase() ?? "?"}</span>
    </div>
  );
}
