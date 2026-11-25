"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("join_trip", { p_code: code });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    router.push(`/trips/${data}/vote`);
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary w-full py-3 text-base" onClick={join} disabled={busy}>
        {busy ? "Joining…" : "Join the trip 🎉"}
      </button>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </>
  );
}
