"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Re-renders the page when anyone in the trip changes something. */
export function RealtimeRefresher({ tripId }: { tripId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase.channel(`trip-${tripId}`);
    for (const table of ["votes", "destinations", "places", "housing", "trip_members"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` }, refresh);
    }
    channel.on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, refresh);
    channel.subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  return null;
}
