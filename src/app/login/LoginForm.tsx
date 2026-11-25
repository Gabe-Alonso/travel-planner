"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  const callbackUrl = (dest = next) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`;

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  async function oauth(provider: "google" | "facebook") {
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl(), data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        setNotice("Almost there! Check your email for a confirmation link.");
      }
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl("/profile?reset=1"),
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button type="button" disabled={busy} onClick={() => oauth("google")} className="btn btn-secondary w-full py-2.5">
          <GoogleIcon /> Continue with Google
        </button>
        <button type="button" disabled={busy} onClick={() => oauth("facebook")} className="btn btn-secondary w-full py-2.5">
          <FacebookIcon /> Continue with Facebook
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400">
        <div className="h-px flex-1 bg-stone-200" /> or with email <div className="h-px flex-1 bg-stone-200" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Explorer" autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        {mode !== "reset" && (
          <div>
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="password">Password</label>
              {mode === "signin" && (
                <button type="button" className="mb-1 text-xs text-brand-700 hover:underline" onClick={() => switchMode("reset")}>
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              className="input"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{notice}</p>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
          {busy ? "One sec…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-600">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => switchMode("signup")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            {mode === "reset" ? "Remembered it?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
