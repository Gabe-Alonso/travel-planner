import Link from "next/link";
import { getTripContext } from "@/lib/data";
import { AvatarStack } from "@/components/Avatar";
import { InviteButton } from "@/components/InviteButton";
import { TripTabs } from "@/components/TripTabs";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { formatDateRange } from "@/lib/utils";

export default async function TripLayout({ children, params }: LayoutProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const { trip, members, isLeader } = await getTripContext(tripId);
  const dates = formatDateRange(trip.start_date, trip.end_date);

  return (
    <>
      <RealtimeRefresher tripId={trip.id} />
      <div className="border-b border-stone-200 bg-surface">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
            ← All trips
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{trip.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                {dates && <span>🗓️ {dates}</span>}
                {isLeader && <span className="font-medium text-amber-700">👑 You&apos;re the Group Leader</span>}
              </div>
              {trip.description && <p className="mt-2 max-w-2xl text-stone-600">{trip.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/trips/${trip.id}/members`} title="See the crew">
                <AvatarStack profiles={members.map((m) => m.profile)} size={30} />
              </Link>
              <InviteButton inviteCode={trip.invite_code} />
            </div>
          </div>
          <div className="mt-4">
            <TripTabs tripId={trip.id} isLeader={isLeader} />
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
