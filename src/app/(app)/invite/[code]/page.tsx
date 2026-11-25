import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { JoinButton } from "./JoinButton";

export const metadata = { title: "Trip invite – Wayfarers" };

type Preview = {
  trip_id: string;
  trip_name: string;
  leader_name: string | null;
  member_count: number;
  already_member: boolean;
};

export default async function InvitePage({ params }: PageProps<"/invite/[code]">) {
  const { code } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("get_invite_preview", { p_code: code });
  const preview = (data as Preview[] | null)?.[0];

  if (preview?.already_member) redirect(`/trips/${preview.trip_id}/vote`);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8 text-center">
        {preview ? (
          <>
            <div className="text-5xl">✈️</div>
            <p className="mt-4 text-sm uppercase tracking-wider text-stone-500">You&apos;re invited to</p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">{preview.trip_name}</h1>
            <p className="mt-2 text-stone-600">
              {preview.leader_name ? <>👑 {preview.leader_name} is the group leader · </> : null}
              {preview.member_count} {Number(preview.member_count) === 1 ? "traveler" : "travelers"} so far
            </p>
            <div className="mt-6">
              <JoinButton code={code} />
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl">🤔</div>
            <h1 className="mt-4 text-xl font-semibold">This invite link doesn&apos;t work</h1>
            <p className="mt-2 text-stone-600">
              It may have been reset by the group leader. Ask them for a fresh link.
            </p>
            <Link href="/" className="btn btn-secondary mt-6">
              Go to my trips
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
