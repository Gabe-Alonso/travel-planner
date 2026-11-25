"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TripTabs({ tripId, isLeader }: { tripId: string; isLeader: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "vote", label: "🗳️ Vote" },
    { href: "places", label: "📍 Places" },
    { href: "housing", label: "🏠 Housing" },
    { href: "members", label: "👥 Crew" },
    ...(isLeader ? [{ href: "settings", label: "⚙️ Settings" }] : []),
  ];
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const href = `/trips/${tripId}/${t.href}`;
        const active = pathname === href;
        return (
          <Link
            key={t.href}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
