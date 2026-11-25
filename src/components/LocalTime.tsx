"use client";
import { useIsClient } from "./useClient";

export function LocalTime({
  iso,
  options = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const isClient = useIsClient();
  if (!isClient) return <span className="opacity-0">…</span>;
  return <time dateTime={iso}>{new Date(iso).toLocaleString(undefined, options)}</time>;
}
