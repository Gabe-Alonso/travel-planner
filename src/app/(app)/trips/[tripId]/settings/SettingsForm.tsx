"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, displayName } from "@/components/Avatar";
import { LocalTime } from "@/components/LocalTime";
import { errorMessage, placeLabel } from "@/lib/utils";
import type { Destination, Member, Trip } from "@/lib/types";

/** ISO timestamp -> value for <input type="datetime-local"> in the viewer's timezone */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      {description && <p className="mb-4 text-sm text-stone-500">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export function SettingsForm({
  trip,
  userId,
  members,
  destinations,
  voteCounts,
}: {
  trip: Trip;
  userId: string;
  members: Member[];
  destinations: Destination[];
  voteCounts: Record<string, number>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description ?? "");
  const [startDate, setStartDate] = useState(trip.start_date ?? "");
  const [endDate, setEndDate] = useState(trip.end_date ?? "");
  const [deadline, setDeadline] = useState(() => toLocalInput(trip.vote_deadline));
  const [decidedId, setDecidedId] = useState(trip.decided_destination_id ?? "");
  const currentLimit = trip.votes_per_person ?? 1;
  const [votesPerPerson, setVotesPerPerson] = useState(currentLimit);

  const saveVoteLimit = () => {
    if (
      votesPerPerson < currentLimit &&
      !confirm(
        `Lower to ${votesPerPerson} ${votesPerPerson === 1 ? "vote" : "votes"} per person? ` +
          "Anyone who has already used more will lose their most recent extra votes.",
      )
    ) {
      return;
    }
    run(
      () => supabase.from("trips").update({ votes_per_person: votesPerPerson }).eq("id", trip.id),
      `Everyone now gets ${votesPerPerson} ${votesPerPerson === 1 ? "vote" : "votes"}.`,
    );
  };

  async function run(fn: () => PromiseLike<{ error: unknown }>, success: string) {
    setBusy(true);
    setToast(null);
    const { error } = await fn();
    setBusy(false);
    setToast(error ? { ok: false, text: errorMessage(error) } : { ok: true, text: success });
    if (!error) router.refresh();
    return !error;
  }

  const saveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate && endDate < startDate) {
      setToast({ ok: false, text: "The end date is before the start date." });
      return;
    }
    run(
      () =>
        supabase
          .from("trips")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            start_date: startDate || null,
            end_date: endDate || null,
          })
          .eq("id", trip.id),
      "Trip details saved.",
    );
  };

  const saveDeadline = (value: string | null) => {
    const iso = value ? new Date(value).toISOString() : null;
    if (iso && new Date(iso) <= new Date() && !trip.decided_destination_id) {
      if (!confirm("That time is in the past, so voting will close right away and the current front-runner wins. Continue?")) return;
    }
    setDeadline(value ? toLocalInput(iso) : "");
    run(
      () => supabase.from("trips").update({ vote_deadline: iso }).eq("id", trip.id),
      iso ? "Voting deadline updated." : "Deadline removed — voting stays open until you decide.",
    );
  };

  const addDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    base.setHours(20, 0, 0, 0);
    saveDeadline(toLocalInput(base.toISOString()));
  };

  const saveDecision = () => {
    const reopening = !decidedId;
    const deadlinePassed = trip.vote_deadline && new Date(trip.vote_deadline) <= new Date();
    const update: Partial<Trip> = { decided_destination_id: decidedId || null };
    if (reopening && deadlinePassed) {
      // Otherwise the vote would immediately re-close.
      update.vote_deadline = null;
      setDeadline("");
    }
    run(
      () => supabase.from("trips").update(update).eq("id", trip.id),
      reopening
        ? deadlinePassed
          ? "Voting reopened. The old deadline had passed, so it was cleared — set a new one above."
          : "Voting reopened."
        : "Destination locked in! 🎉",
    );
  };

  const resetInvite = () => {
    if (!confirm("Reset the invite link? The old link will stop working (current members stay).")) return;
    run(
      () => supabase.from("trips").update({ invite_code: crypto.randomUUID().replace(/-/g, "") }).eq("id", trip.id),
      "New invite link created. Share it from the Invite button.",
    );
  };

  const setRole = (m: Member, role: "leader" | "member") =>
    run(
      () => supabase.from("trip_members").update({ role }).eq("trip_id", trip.id).eq("user_id", m.user_id),
      role === "leader" ? `${displayName(m.profile)} is now a Group Leader 👑` : `${displayName(m.profile)} is now a member.`,
    );

  const removeMember = (m: Member) => {
    if (!confirm(`Remove ${displayName(m.profile)} from the trip?`)) return;
    run(
      () => supabase.from("trip_members").delete().eq("trip_id", trip.id).eq("user_id", m.user_id),
      `${displayName(m.profile)} was removed.`,
    );
  };

  const deleteTrip = async () => {
    const typed = prompt(`This permanently deletes "${trip.name}" for everyone. Type the trip name to confirm:`);
    if (typed?.trim() !== trip.name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    if (error) {
      setBusy(false);
      setToast({ ok: false, text: errorMessage(error) });
      return;
    }
    router.push("/");
    router.refresh();
  };

  const leaderCount = members.filter((m) => m.role === "leader").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {toast && (
        <div
          className={`sticky top-16 z-20 rounded-xl px-4 py-3 text-sm shadow-sm ${
            toast.ok ? "bg-brand-50 text-brand-900 ring-1 ring-brand-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      <Section title="Trip details">
        <form onSubmit={saveDetails} className="space-y-4">
          <div>
            <label className="label" htmlFor="s-name">Name</label>
            <input id="s-name" className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-desc">Description</label>
            <textarea id="s-desc" className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="s-start">Start date</label>
              <input id="s-start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="s-end">End date</label>
              <input id="s-end" type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy}>Save details</button>
        </form>
      </Section>

      <Section title="⏳ Voting deadline" description="When the timer runs out, the destination with the most votes wins automatically. Ties come back to you.">
        <div className="space-y-3">
          {trip.vote_deadline && (
            <p className="text-sm text-stone-600">
              Currently: <strong><LocalTime iso={trip.vote_deadline} /></strong>
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <label className="label" htmlFor="s-deadline">Ends at (your local time)</label>
              <input
                id="s-deadline"
                type="datetime-local"
                className="input"
                value={deadline}
                suppressHydrationWarning
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" disabled={busy || !deadline} onClick={() => saveDeadline(deadline)}>
              Set deadline
            </button>
            {trip.vote_deadline && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => saveDeadline(null)}>
                Remove
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-stone-500">Quick set (8pm):</span>
            {[1, 3, 7, 14].map((d) => (
              <button key={d} className="rounded-full bg-stone-100 px-3 py-0.5 hover:bg-stone-200" disabled={busy} onClick={() => addDays(d)}>
                {d === 1 ? "Tomorrow" : d === 7 ? "1 week" : d === 14 ? "2 weeks" : `${d} days`}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="🗳️ Votes per person"
        description="Everyone gets the same number of votes and can spread them across different destinations (one vote per destination)."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center overflow-hidden rounded-lg border border-stone-300 bg-surface shadow-sm">
            <button
              type="button"
              className="px-3 py-2 text-lg leading-none hover:bg-stone-50 disabled:opacity-40"
              disabled={busy || votesPerPerson <= 1}
              onClick={() => setVotesPerPerson((v) => Math.max(1, v - 1))}
              aria-label="Fewer votes"
            >
              −
            </button>
            <span className="min-w-12 text-center text-lg font-semibold tabular-nums" aria-live="polite">
              {votesPerPerson}
            </span>
            <button
              type="button"
              className="px-3 py-2 text-lg leading-none hover:bg-stone-50 disabled:opacity-40"
              disabled={busy || votesPerPerson >= 10}
              onClick={() => setVotesPerPerson((v) => Math.min(10, v + 1))}
              aria-label="More votes"
            >
              +
            </button>
          </div>
          <span className="text-sm text-stone-500">{votesPerPerson === 1 ? "vote" : "votes"} each</span>
          <button
            className="btn btn-primary"
            disabled={busy || votesPerPerson === currentLimit}
            onClick={saveVoteLimit}
          >
            Save
          </button>
        </div>
      </Section>

      <Section
        title="📍 Decided destination"
        description="Override the vote result at any time, or reopen voting by choosing “Not decided yet”."
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <label className="label" htmlFor="s-decided">Destination</label>
            <select id="s-decided" className="input" value={decidedId} onChange={(e) => setDecidedId(e.target.value)}>
              <option value="">— Not decided yet (voting open) —</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {placeLabel(d)} · {voteCounts[d.id] ?? 0} {(voteCounts[d.id] ?? 0) === 1 ? "vote" : "votes"}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            disabled={busy || decidedId === (trip.decided_destination_id ?? "")}
            onClick={saveDecision}
          >
            Save
          </button>
        </div>
        {destinations.length === 0 && (
          <p className="mt-2 text-sm text-stone-500">No destinations have been suggested yet — add some on the Vote tab.</p>
        )}
      </Section>

      <Section title="👥 Crew" description="Group Leaders can change settings and manage the crew. You can have more than one.">
        <ul className="divide-y divide-stone-100">
          {members.map((m) => {
            const isMe = m.user_id === userId;
            const lastLeader = m.role === "leader" && leaderCount === 1;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar profile={m.profile} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {displayName(m.profile)} {isMe && <span className="text-stone-400">(you)</span>}
                  </div>
                  <div className="text-xs text-stone-500">
                    {m.role === "leader" ? "👑 Group Leader" : "Member"}
                    {m.profile?.email ? ` · ${m.profile.email}` : ""}
                  </div>
                </div>
                {m.role === "member" ? (
                  <button className="btn btn-secondary py-1 text-xs" disabled={busy} onClick={() => setRole(m, "leader")}>
                    Make Group Leader
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary py-1 text-xs"
                    disabled={busy || lastLeader}
                    title={lastLeader ? "A trip needs at least one Group Leader" : undefined}
                    onClick={() => setRole(m, "member")}
                  >
                    {isMe ? "Step down" : "Remove leader role"}
                  </button>
                )}
                {!isMe && (
                  <button className="btn btn-ghost py-1 text-xs text-red-600 hover:bg-red-50" disabled={busy} onClick={() => removeMember(m)}>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="🔗 Invite link" description="Resetting creates a new link; the old one stops working. Existing members aren't affected.">
        <button className="btn btn-secondary" disabled={busy} onClick={resetInvite}>
          Reset invite link
        </button>
      </Section>

      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="text-lg font-semibold text-red-800">Danger zone</h2>
        <p className="mb-4 text-sm text-red-700">Deleting the trip removes all votes, places and housing for everyone.</p>
        <button className="btn btn-danger" disabled={busy} onClick={deleteTrip}>
          Delete trip
        </button>
      </section>
    </div>
  );
}
