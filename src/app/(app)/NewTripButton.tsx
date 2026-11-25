"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export function NewTripButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("create_trip", {
      p_name: name,
      p_description: description,
    });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    router.push(`/trips/${data}/vote`);
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        ＋ New trip
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && !busy && setOpen(false)}
        >
          <form onSubmit={create} className="card w-full max-w-md space-y-4 p-6">
            <div>
              <h2 className="text-xl font-semibold">Start a new trip</h2>
              <p className="text-sm text-stone-600">You&apos;ll be the 👑 Group Leader. You can invite friends next.</p>
            </div>
            <div>
              <label className="label" htmlFor="trip-name">Trip name</label>
              <input
                id="trip-name"
                className="input"
                autoFocus
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer 2027 with the gang"
              />
            </div>
            <div>
              <label className="label" htmlFor="trip-desc">Description (optional)</label>
              <textarea
                id="trip-desc"
                className="input min-h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A week somewhere warm with good food"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create trip"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
