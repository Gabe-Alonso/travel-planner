import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="card max-w-md p-8 text-center">
        <div className="text-5xl">🧳</div>
        <h1 className="mt-4 text-xl font-semibold">Nothing here</h1>
        <p className="mt-2 text-stone-600">
          This page or trip doesn&apos;t exist, or you&apos;re not a member yet. If it&apos;s a trip, ask someone on it for an invite link.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Back to my trips
        </Link>
      </div>
    </main>
  );
}
