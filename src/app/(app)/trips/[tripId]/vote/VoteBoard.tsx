"use client";
import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, displayName } from "@/components/Avatar";
import { CityAutocomplete, type CityResult } from "@/components/CityAutocomplete";
import { Countdown } from "@/components/Countdown";
import { LocalTime } from "@/components/LocalTime";
import { Thumb } from "@/components/Thumb";
import { errorMessage } from "@/lib/utils";
import type { Destination, Member, Trip, Vote } from "@/lib/types";

type VoteAction =
  | { type: "add"; destinationId: string }
  | { type: "remove"; destinationId: string }
  | { type: "swap"; from: string; to: string };

export function VoteBoard({
  trip,
  userId,
  isLeader,
  votingOpen,
  members,
  destinations,
  votes,
}: {
  trip: Trip;
  userId: string;
  isLeader: boolean;
  votingOpen: boolean;
  members: Member[];
  destinations: Destination[];
  votes: Vote[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const [optimisticVotes, applyVote] = useOptimistic(votes, (state: Vote[], action: VoteAction) => {
    const mine = (d: string) => (v: Vote) => v.user_id === userId && v.destination_id === d;
    const vote = (d: string): Vote => ({ trip_id: trip.id, user_id: userId, destination_id: d });
    if (action.type === "add") return [...state, vote(action.destinationId)];
    if (action.type === "remove") return state.filter((v) => !mine(action.destinationId)(v));
    return [...state.filter((v) => !mine(action.from)(v)), vote(action.to)];
  });

  const profileById = useMemo(() => new Map(members.map((m) => [m.user_id, m.profile])), [members]);
  const limit = Math.max(1, trip.votes_per_person ?? 1);
  const myVotes = new Set(optimisticVotes.filter((v) => v.user_id === userId).map((v) => v.destination_id));
  const votesLeft = Math.max(0, limit - myVotes.size);

  const ranked = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const v of optimisticVotes) counts.set(v.destination_id, [...(counts.get(v.destination_id) ?? []), v.user_id]);
    return destinations
      .map((d) => ({ dest: d, voters: counts.get(d.id) ?? [] }))
      .sort((a, b) => b.voters.length - a.voters.length || a.dest.created_at.localeCompare(b.dest.created_at));
  }, [destinations, optimisticVotes]);

  const topCount = ranked[0]?.voters.length ?? 0;
  const leaders = ranked.filter((r) => r.voters.length === topCount && topCount > 0);
  const decided = destinations.find((d) => d.id === trip.decided_destination_id) ?? null;
  const notVoted = members.filter((m) => !optimisticVotes.some((v) => v.user_id === m.user_id));
  const deadlinePassed = !!trip.vote_deadline && !votingOpen && !decided;

  function castVote(destinationId: string) {
    if (!votingOpen) return;
    setError(null);

    let action: VoteAction;
    if (myVotes.has(destinationId)) {
      action = { type: "remove", destinationId };
    } else if (votesLeft > 0) {
      action = { type: "add", destinationId };
    } else if (limit === 1) {
      // Single-vote mode: tapping another option moves your vote
      action = { type: "swap", from: [...myVotes][0], to: destinationId };
    } else {
      setError(`You've used all ${limit} of your votes — tap one of your picks to take a vote back first.`);
      return;
    }

    startTransition(async () => {
      applyVote(action);
      const votesTable = createClient().from("votes");
      const del = (d: string) =>
        createClient().from("votes").delete().eq("trip_id", trip.id).eq("user_id", userId).eq("destination_id", d);
      let result;
      if (action.type === "remove") {
        result = await del(action.destinationId);
      } else {
        if (action.type === "swap") {
          const removed = await del(action.from);
          if (removed.error) result = removed;
        }
        result ??= await votesTable.insert({
          trip_id: trip.id,
          user_id: userId,
          destination_id: action.type === "add" ? action.destinationId : action.to,
        });
      }
      if (result.error) setError(errorMessage(result.error));
      router.refresh();
    });
  }

  async function addDestination(city: CityResult) {
    setError(null);
    setAdding(city.name);
    try {
      const qs = new URLSearchParams({ name: city.name, region: city.admin1 ?? "", country: city.country ?? "" });
      const img = await fetch(`/api/city-image?${qs}`).then((r) => r.json()).catch(() => ({ image: null }));
      const { error } = await createClient().from("destinations").insert({
        trip_id: trip.id,
        name: city.name,
        region: city.admin1 ?? null,
        country: city.country ?? null,
        country_code: city.country_code ?? null,
        latitude: city.latitude,
        longitude: city.longitude,
        thumbnail_url: img.image ?? null,
        added_by: userId,
      });
      if (error) {
        setError(error.code === "23505" ? `${city.name} is already on the list — give it a vote below!` : errorMessage(error));
      } else {
        router.refresh();
      }
    } finally {
      setAdding(null);
    }
  }

  async function removeDestination(d: Destination) {
    if (!confirm(`Remove ${d.name} from the vote? Any votes for it will be cleared.`)) return;
    const { error } = await createClient().from("destinations").delete().eq("id", d.id);
    if (error) setError(errorMessage(error));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* ---------- Status hero ---------- */}
      {decided ? (
        <section className="relative overflow-hidden rounded-3xl text-white shadow-lg">
          <Thumb src={decided.thumbnail_url} label={decided.name} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
          <div className="relative p-8 sm:p-10">
            <div className="text-sm font-medium uppercase tracking-widest text-white/80">🎉 It&apos;s decided</div>
            <h2 className="mt-2 text-4xl font-bold sm:text-5xl">{decided.name}</h2>
            <p className="mt-1 text-lg text-white/85">{[decided.region, decided.country].filter(Boolean).join(", ")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/trips/${trip.id}/places`} className="btn bg-white text-stone-900 hover:bg-stone-100">
                📍 Plan places to go
              </Link>
              <Link href={`/trips/${trip.id}/housing`} className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25">
                🏠 Find somewhere to stay
              </Link>
              {isLeader && (
                <Link href={`/trips/${trip.id}/settings`} className="btn text-white/80 hover:text-white">
                  Change destination
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-sky-800 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold">Where should we go?</h2>
              {votingOpen && limit > 1 && (
                <p className="mt-1 font-medium text-white">🗳️ Everyone gets {limit} votes — spread them across your favorites.</p>
              )}
              {votingOpen && trip.vote_deadline && (
                <p className="mt-1 text-white/85">
                  Voting closes <LocalTime iso={trip.vote_deadline} />
                </p>
              )}
              {votingOpen && !trip.vote_deadline && (
                <p className="mt-1 text-white/85">
                  Voting is open — no deadline yet.{" "}
                  {isLeader ? (
                    <Link href={`/trips/${trip.id}/settings`} className="font-medium underline">
                      Set a deadline
                    </Link>
                  ) : (
                    "The group leader can set one."
                  )}
                </p>
              )}
              {deadlinePassed && (
                <p className="mt-1 text-white/90">
                  ⏰ Voting closed <LocalTime iso={trip.vote_deadline!} />.{" "}
                  {leaders.length > 1
                    ? `It's a ${leaders.length}-way tie! `
                    : topCount === 0
                      ? "Nobody voted. "
                      : ""}
                  {isLeader ? (
                    <Link href={`/trips/${trip.id}/settings`} className="font-medium underline">
                      Pick the destination or extend the deadline
                    </Link>
                  ) : (
                    "Waiting on the group leader to decide."
                  )}
                </p>
              )}
            </div>
            {votingOpen && trip.vote_deadline && <Countdown deadline={trip.vote_deadline} />}
          </div>
        </section>
      )}

      {/* ---------- Add a destination ---------- */}
      {(votingOpen || isLeader) && !decided && (
        <section className="card p-5">
          <h3 className="font-semibold text-stone-900">Suggest a destination</h3>
          <p className="mb-3 text-sm text-stone-500">
            Vote for an existing option below, or add a new city to the list.
          </p>
          <CityAutocomplete onSelect={addDestination} disabled={!!adding} />
          {adding && <p className="mt-2 text-sm text-stone-500">Adding {adding}…</p>}
        </section>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {/* ---------- Options ---------- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-stone-900">
            {ranked.length ? `The options (${ranked.length})` : "No options yet"}
          </h3>
          {votingOpen && ranked.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-stone-600" title="Tap a pick again to take that vote back">
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: limit }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${i < votesLeft ? "bg-brand-500" : "bg-stone-300"}`}
                  />
                ))}
              </span>
              {limit === 1
                ? myVotes.size
                  ? "Tap another option to move your vote"
                  : "You have 1 vote"
                : votesLeft
                  ? `${votesLeft} of ${limit} votes left`
                  : `All ${limit} votes used`}
            </div>
          )}
        </div>

        {ranked.length === 0 && (
          <div className="card px-6 py-12 text-center text-stone-500">
            <div className="text-4xl">🌍</div>
            <p className="mt-2">Be the first to suggest somewhere!</p>
          </div>
        )}

        {ranked.map(({ dest, voters }) => {
          const mine = myVotes.has(dest.id);
          // Share of the crew that picked this option
          const pct = members.length ? Math.round((voters.length / members.length) * 100) : 0;
          const isTop = voters.length > 0 && voters.length === topCount && leaders.length === 1;
          const isDecided = decided?.id === dest.id;
          const canRemove = (dest.added_by === userId && votingOpen) || isLeader;
          return (
            <div
              key={dest.id}
              className={`card flex flex-col overflow-hidden transition sm:flex-row ${
                mine ? "border-brand-500 ring-2 ring-brand-200" : ""
              } ${isDecided ? "border-amber-400 ring-2 ring-amber-200" : ""}`}
            >
              <button
                type="button"
                onClick={() => castVote(dest.id)}
                disabled={!votingOpen}
                className="relative shrink-0 sm:w-56 disabled:cursor-default"
                aria-label={`Vote for ${dest.name}`}
              >
                <Thumb src={dest.thumbnail_url} label={dest.name} className="aspect-[16/9] h-full w-full sm:aspect-auto sm:min-h-36" />
                {isTop && !decided && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow">
                    🔥 Leading
                  </span>
                )}
                {isDecided && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow">
                    🏆 Winner
                  </span>
                )}
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-stone-900">{dest.name}</h4>
                    <p className="truncate text-sm text-stone-500">
                      {[dest.region, dest.country].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      Suggested by {displayName(profileById.get(dest.added_by ?? ""))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {votingOpen && (
                      <button
                        type="button"
                        onClick={() => castVote(dest.id)}
                        className={`btn ${mine ? "btn-primary" : "btn-secondary"}`}
                      >
                        {mine ? "✓ Your vote" : "Vote"}
                      </button>
                    )}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => removeDestination(dest)}
                        className="btn btn-ghost px-2 text-stone-400 hover:text-red-600"
                        title="Remove option"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-stone-500">
                    <span>
                      {voters.length} {voters.length === 1 ? "vote" : "votes"}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isTop || isDecided ? "bg-amber-400" : "bg-brand-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex min-h-9 flex-wrap items-center gap-1.5">
                  {voters.map((uid) => {
                    const p = profileById.get(uid);
                    return (
                      <span key={uid} className="flex items-center gap-1.5 rounded-full bg-stone-100 py-0.5 pl-0.5 pr-2.5 text-xs text-stone-700">
                        <Avatar profile={p} size={26} />
                        {uid === userId ? "You" : displayName(p).split(" ")[0]}
                      </span>
                    );
                  })}
                  {voters.length === 0 && <span className="text-xs text-stone-400">No votes yet</span>}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {notVoted.length > 0 && !decided && ranked.length > 0 && (
        <section className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
          <span>🤔 Still deciding:</span>
          {notVoted.map((m) => (
            <span key={m.user_id} className="flex items-center gap-1.5">
              <Avatar profile={m.profile} size={24} />
              {m.user_id === userId ? "You" : displayName(m.profile).split(" ")[0]}
            </span>
          ))}
        </section>
      )}
    </div>
  );
}
