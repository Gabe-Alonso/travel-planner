import { getMyProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Your profile – Wayfarers" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const sp = await searchParams;
  const profile = await getMyProfile();
  const { user } = await requireUser();
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Your profile</h1>
      <ProfileForm profile={profile} providers={providers} resetMode={sp.reset === "1"} />
    </main>
  );
}
