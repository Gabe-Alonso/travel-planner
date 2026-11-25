import { SiteHeader } from "@/components/SiteHeader";
import { getMyProfile } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getMyProfile();
  return (
    <>
      <SiteHeader profile={profile} />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
