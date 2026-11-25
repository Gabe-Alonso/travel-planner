import { safeNext } from "@/lib/utils";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in – Wayfarers" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const error = typeof sp.error === "string" ? sp.error : null;
  const invited = next.startsWith("/invite/");

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-brand-100),_transparent_60%),radial-gradient(ellipse_at_bottom_right,_#fde8c8,_transparent_55%)]" />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-5xl">🧭</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">Wayfarers</h1>
          <p className="mt-2 text-stone-600">
            {invited
              ? "You've been invited on a trip! Sign in to join the crew."
              : "Plan trips with your friends — vote, scout, and book together."}
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <LoginForm next={next} initialError={error} />
        </div>
      </div>
    </main>
  );
}
