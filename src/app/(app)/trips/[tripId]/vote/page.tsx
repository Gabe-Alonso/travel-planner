import { getTripContext } from "@/lib/data";
import type { Destination, Vote } from "@/lib/types";
import { VoteBoard } from "./VoteBoard";

export const metadata = { title: "Vote – Wayfarers" };

export default async function VotePage({ params }: PageProps<"/trips/[tripId]/vote">) {
  const { tripId } = await params;
  const { supabase, user, trip, members, isLeader, votingOpen } = await getTripContext(tripId);

  const [{ data: destinations }, { data: votes }] = await Promise.all([
    supabase.from("destinations").select("*").eq("trip_id", tripId).order("created_at"),
    supabase.from("votes").select("trip_id, user_id, destination_id").eq("trip_id", tripId),
  ]);

  return (
    <VoteBoard
      trip={trip}
      userId={user.id}
      isLeader={isLeader}
      votingOpen={votingOpen}
      members={members}
      destinations={(destinations ?? []) as Destination[]}
      votes={(votes ?? []) as Vote[]}
    />
  );
}
