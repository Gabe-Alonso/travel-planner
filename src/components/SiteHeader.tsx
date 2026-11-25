import Link from "next/link";
import { Avatar } from "./Avatar";
import type { Profile } from "@/lib/types";

export function SiteHeader({ profile }: { profile: Profile | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
          <span className="text-xl">🧭</span> Wayfarers
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/profile" className="btn btn-ghost px-2" title="Your profile">
            <Avatar profile={profile} size={28} />
            <span className="hidden text-sm sm:inline">{profile?.display_name}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button className="btn btn-ghost text-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
