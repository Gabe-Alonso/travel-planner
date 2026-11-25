import { getTripContext } from "@/lib/data";
import { Avatar, displayName } from "@/components/Avatar";
import { InviteButton } from "@/components/InviteButton";
import { LocalTime } from "@/components/LocalTime";
import { LeaveTripButton } from "./LeaveTripButton";

export const metadata = { title: "Crew – Wayfarers" };

export default async function MembersPage({ params }: PageProps<"/trips/[tripId]/members">) {
  const { tripId } = await params;
  const { user, trip, members, isLeader } = await getTripContext(tripId);
  const leaderCount = members.filter((m) => m.role === "leader").length;
  const soleLeader = isLeader && leaderCount === 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">Bring more friends</h2>
          <p className="text-sm text-stone-600">Anyone with the invite link can join after signing in.</p>
        </div>
        <InviteButton inviteCode={trip.invite_code} />
      </div>

      <div className="card divide-y divide-stone-100">
        <div className="px-5 py-3 text-sm font-medium text-stone-500">
          {members.length} {members.length === 1 ? "traveler" : "travelers"}
        </div>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-4 px-5 py-3">
            <Avatar profile={m.profile} size={44} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-stone-900">
                {displayName(m.profile)} {m.user_id === user.id && <span className="text-stone-400">(you)</span>}
              </div>
              <div className="text-xs text-stone-500">
                Joined <LocalTime iso={m.joined_at} options={{ month: "short", day: "numeric", year: "numeric" }} />
              </div>
            </div>
            {m.role === "leader" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                👑 Group Leader
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <LeaveTripButton tripId={tripId} userId={user.id} soleLeader={soleLeader} />
      </div>
    </div>
  );
}
