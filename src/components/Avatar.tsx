/* eslint-disable @next/next/no-img-element */
import type { Profile } from "@/lib/types";

const COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-lime-600", "bg-emerald-600",
  "bg-teal-600", "bg-sky-600", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
];

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function displayName(p: Profile | null | undefined) {
  return p?.display_name || p?.email?.split("@")[0] || "Traveler";
}

export function Avatar({
  profile,
  size = 32,
  ring = false,
  title,
}: {
  profile: Profile | null | undefined;
  size?: number;
  ring?: boolean;
  title?: string;
}) {
  const name = displayName(profile);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.4) };
  const ringCls = ring ? "ring-2 ring-surface" : "";

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        title={title ?? name}
        referrerPolicy="no-referrer"
        style={style}
        className={`inline-block shrink-0 rounded-full object-cover ${ringCls}`}
      />
    );
  }
  return (
    <span
      title={title ?? name}
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(
        profile?.id ?? name,
      )} ${ringCls}`}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ profiles, size = 28, max = 6 }: { profiles: (Profile | null)[]; size?: number; max?: number }) {
  const shown = profiles.slice(0, max);
  const extra = profiles.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={p?.id ?? i} profile={p} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          style={{ width: size, height: size }}
          className="inline-flex items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-700 ring-2 ring-surface"
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
