import { getDecidedDestination, getTripContext } from "@/lib/data";
import { LinkBoard } from "@/components/LinkBoard";
import { placeLabel } from "@/lib/utils";
import type { LinkItem } from "@/lib/types";

export const metadata = { title: "Housing – Wayfarers" };

export default async function HousingPage({ params }: PageProps<"/trips/[tripId]/housing">) {
  const { tripId } = await params;
  const { supabase, user, trip, members, isLeader } = await getTripContext(tripId);
  const [destination, { data: items }] = await Promise.all([
    getDecidedDestination(tripId, trip.decided_destination_id),
    supabase.from("housing").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">
          {destination ? `Places to stay in ${destination.name}` : "Places to stay"}
        </h2>
        <p className="text-stone-600">
          Paste an Airbnb, Booking.com, Vrbo or hotel link — we&apos;ll grab the photo and title automatically.
        </p>
      </div>
      <LinkBoard
        kind="housing"
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
