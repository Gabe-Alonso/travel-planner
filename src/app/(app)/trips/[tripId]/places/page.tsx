import Link from "next/link";
import { getDecidedDestination, getTripContext } from "@/lib/data";
import { LinkBoard } from "@/components/LinkBoard";
import { placeLabel } from "@/lib/utils";
import type { LinkItem } from "@/lib/types";

export const metadata = { title: "Places – Wayfarers" };

export default async function PlacesPage({ params }: PageProps<"/trips/[tripId]/places">) {
  const { tripId } = await params;
  const { supabase, user, trip, members, isLeader } = await getTripContext(tripId);
  const [destination, { data: items }] = await Promise.all([
    getDecidedDestination(tripId, trip.decided_destination_id),
    supabase.from("places").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">
          {destination ? `Places to go in ${destination.name}` : "Places to go"}
        </h2>
        <p className="text-stone-600">Restaurants, sights, bars, hikes — anything the crew wants to check out.</p>
      </div>
      {!destination && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          🗳️ The destination hasn&apos;t been decided yet.{" "}
          <Link href={`/trips/${tripId}/vote`} className="font-medium underline">
            Go vote
          </Link>{" "}
          — you can still start a wishlist here.
        </div>
      )}
      <LinkBoard
        kind="places"
        tripId={tripId}
        userId={user.id}
        isLeader={isLeader}
        members={members}
        items={(items ?? []) as LinkItem[]}
        destinationLabel={destination ? placeLabel(destination) : null}
      />
    </div>
  );
}
