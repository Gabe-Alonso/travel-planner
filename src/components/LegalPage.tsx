import Link from "next/link";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Wayfarers
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
      <p className="mt-1 text-sm text-stone-500">Last updated {updated}</p>
      <div className="mt-8 space-y-5 leading-relaxed text-stone-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </main>
  );
}
