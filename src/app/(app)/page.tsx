import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data";
import { Thumb } from "@/components/Thumb";
import { AvatarStack } from "@/components/Avatar";
import { formatDateRange, placeLabel } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { NewTripButton } from "./NewTripButton";

export const metadata = { title: "Your trips – Wayfarers" };

type TripCard = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  vote_deadline: string | null;
  created_at: string;
  decided: { name: string; region: string | null; country: string | null; thumbnail_url: string | null } | null;
  trip_members: { role: string; user_id: string; profile: Profile | null }[];
};

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const profile = await getMyProfile();

  const { data } = await supabase
    .from("trips")
    .select(
      `id, name, description, start_date, end_date, vote_deadline, created_at,
       decided:destinations!trips_decided_destination_fkey(name, region, country, thumbnail_url),
       trip_members(role, user_id, profile:profiles(id, display_name, avatar_url))`,
    )
    .order("created_at", { ascending: false });

  const trips = (data ?? []) as unknown as TripCard[];
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            {firstName ? `Hey ${firstName}, where to next?` : "Where to next?"}
          </h1>
          <p className="mt-1 text-stone-600">Your trips live here. Start one and invite the crew.</p>
        </div>
        <NewTripButton />
      </div>

      {trips.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <div className="text-6xl">🗺️</div>
          <h2 className="mt-4 text-xl font-semibold">No trips yet</h2>
          <p className="mt-1 max-w-sm text-stone-600">
            Create a trip, then share the invite link with your friends so everyone can vote on where to go.
          </p>
          <div className="mt-6">
            <NewTripButton />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => {
            const isLeader = t.trip_members.some((m) => m.user_id === user.id && m.role === "leader");
            const dates = formatDateRange(t.start_date, t.end_date);
            return (
              <Link
                key={t.id}
                href={`/trips/${t.id}/vote`}
                className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative">
                  <Thumb src={t.decided?.thumbnail_url} label={t.decided?.name ?? t.name} className="aspect-[16/9] w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="text-xs font-medium uppercase tracking-wider opacity-90">
                      {t.decided ? `📍 ${placeLabel(t.decided)}` : "🗳️ Destination TBD"}
                    </div>
                  </div>
                  {isLeader && (
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-stone-800">
                      👑 Group Leader
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-stone-900 group-hover:text-brand-700">{t.name}</h2>
                  {dates && <p className="text-sm text-stone-500">{dates}</p>}
                  {t.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{t.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <AvatarStack profiles={t.trip_members.map((m) => m.profile)} size={26} />
                    <span className="text-xs text-stone-500">
                      {t.trip_members.length} {t.trip_members.length === 1 ? "traveler" : "travelers"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
