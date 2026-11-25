"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { errorMessage } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function ProfileForm({
  profile,
  providers,
  resetMode,
}: {
  profile: Profile;
  providers: string[];
  resetMode: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    resetMode ? { ok: true, text: "Choose a new password below." } : null,
  );
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient()
      .from("profiles")
      .update({ display_name: name.trim() || null, avatar_url: avatarUrl.trim() || null })
      .eq("id", profile.id);
    setBusy(false);
    setMsg(error ? { ok: false, text: errorMessage(error) } : { ok: true, text: "Profile saved." });
    router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    setPassword("");
    setMsg(error ? { ok: false, text: errorMessage(error) } : { ok: true, text: "Password updated." });
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={saveProfile} className="card space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar profile={{ ...profile, display_name: name, avatar_url: avatarUrl || null }} size={64} />
          <div>
            <div className="font-semibold">{name || "Traveler"}</div>
            <div className="text-sm text-stone-500">{profile.email}</div>
            {providers.length > 0 && (
              <div className="mt-1 text-xs text-stone-400">Signed in with: {providers.join(", ")}</div>
            )}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="dn">Display name</label>
          <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="av">Profile picture URL</label>
          <input
            id="av"
            className="input"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className="mt-1 text-xs text-stone-500">Google/Facebook sign-ins fill this in automatically.</p>
        </div>
        <button className="btn btn-primary" disabled={busy}>Save profile</button>
      </form>

      <form onSubmit={savePassword} className="card space-y-4 p-6">
        <div>
          <h2 className="font-semibold">{resetMode ? "Set a new password" : "Change password"}</h2>
          <p className="text-sm text-stone-500">Lets you sign in with email + password too.</p>
        </div>
        <input
          type="password"
          className="input"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
        />
        <button className="btn btn-secondary" disabled={busy}>Update password</button>
      </form>
    </div>
  );
}
