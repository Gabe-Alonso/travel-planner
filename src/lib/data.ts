import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { Member, Profile, Trip } from "@/lib/types";

export const getMyProfile = cache(async (): Promise<Profile> => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();
  return (
    data ?? {
      id: user.id,
      display_name: (user.user_metadata?.full_name as string) ?? user.email ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
      email: user.email,
    }
  );
});

/** Loads a trip + its members for the current user. 404s if they aren't a member. */
export const getTripContext = cache(async (tripId: string) => {
  const { supabase, user } = await requireUser();

  const [{ data: tripRow }, { data: memberRows }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("trip_members")
      .select("trip_id, user_id, role, joined_at, profile:profiles(id, display_name, avatar_url, email)")
      .eq("trip_id", tripId)
      .order("joined_at"),
  ]);
  if (!tripRow) notFound();

  const trip = tripRow as Trip;

  // If the voting deadline has passed, lock in the winner.
  if (!trip.decided_destination_id && trip.vote_deadline && new Date(trip.vote_deadline) <= new Date()) {
    const { data: decided } = await supabase.rpc("finalize_vote", { p_trip: tripId });
    if (decided) trip.decided_destination_id = decided as string;
  }

  const members = (memberRows ?? []) as unknown as Member[];
  const me = members.find((m) => m.user_id === user.id);
  const votingOpen =
    !trip.decided_destination_id && (!trip.vote_deadline || new Date(trip.vote_deadline) > new Date());

  return {
    supabase,
    user,
    trip,
    members,
    isLeader: me?.role === "leader",
    votingOpen,
  };
});

export async function getDecidedDestination(tripId: string, destinationId: string | null) {
  if (!destinationId) return null;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("destinations")
    .select("*")
    .eq("trip_id", tripId)
    .eq("id", destinationId)
    .maybeSingle();
  return data;
}
