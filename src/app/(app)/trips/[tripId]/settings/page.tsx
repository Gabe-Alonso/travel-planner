import { redirect } from "next/navigation";
import { getTripContext } from "@/lib/data";
import type { Destination } from "@/lib/types";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Trip settings – Wayfarers" };

export default async function SettingsPage({ params }: PageProps<"/trips/[tripId]/settings">) {
  const { tripId } = await params;
  const { supabase, user, trip, members, isLeader } = await getTripContext(tripId);
  if (!isLeader) redirect(`/trips/${tripId}/vote`);

  const [{ data: destinations }, { data: votes }] = await Promise.all([
    supabase.from("destinations").select("*").eq("trip_id", tripId).order("name"),
    supabase.from("votes").select("destination_id").eq("trip_id", tripId),
  ]);
  const voteCounts: Record<string, number> = {};
  for (const v of votes ?? []) voteCounts[v.destination_id] = (voteCounts[v.destination_id] ?? 0) + 1;

  return (
    <SettingsForm
      trip={trip}
      userId={user.id}
      members={members}
      destinations={(destinations ?? []) as Destination[]}
      voteCounts={voteCounts}
    />
  );
}
