import { redirect } from "next/navigation";

export default async function TripIndex({ params }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  redirect(`/trips/${tripId}/vote`);
}
