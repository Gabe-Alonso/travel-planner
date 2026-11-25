"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export function LeaveTripButton({ tripId, userId, soleLeader }: { tripId: string; userId: string; soleLeader: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (soleLeader) {
      setError("You're the only Group Leader. Make someone else a leader in Settings first (or delete the trip).");
      return;
    }
    if (!confirm("Leave this trip? You'll need a new invite link to rejoin.")) return;
    const { error } = await createClient().from("trip_members").delete().eq("trip_id", tripId).eq("user_id", userId);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost text-sm text-stone-500 hover:text-red-600" onClick={leave}>
        Leave trip
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </>
  );
}
