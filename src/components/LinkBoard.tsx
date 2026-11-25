"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, displayName } from "@/components/Avatar";
import { Thumb } from "@/components/Thumb";
import { errorMessage, hostnameOf } from "@/lib/utils";
import type { LinkItem, LinkPreview, Member } from "@/lib/types";

type Kind = "places" | "housing";

export const PLACE_CATEGORIES = [
  "🍽️ Food & drink",
  "🏛️ Sightseeing",
  "🎟️ Activity",
  "🌿 Nature",
  "🛍️ Shopping",
  "🍸 Nightlife",
  "✨ Other",
];

function mapsUrl(name: string, near: string | null) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, near].filter(Boolean).join(", "))}`;
}

export function LinkBoard({
  kind,
  tripId,
  userId,
  isLeader,
  members,
  items,
  destinationLabel,
}: {
  kind: Kind;
  tripId: string;
  userId: string;
  isLeader: boolean;
  members: Member[];
  items: LinkItem[];
  destinationLabel: string | null;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(items.length === 0);
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profileById = useMemo(() => new Map(members.map((m) => [m.user_id, m.profile])), [members]);

  const noun = kind === "places" ? "place" : "stay";
  const categoriesInUse = useMemo(
    () => PLACE_CATEGORIES.filter((c) => items.some((i) => i.category === c)),
    [items],
  );
  const shown = filter ? items.filter((i) => i.category === filter) : items;

  async function remove(item: LinkItem) {
    if (!confirm(`Remove "${item.name}"?`)) return;
    const { error } = await createClient().from(kind).delete().eq("id", item.id);
    if (error) setError(errorMessage(error));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {kind === "places" && categoriesInUse.length > 1 && (
            <>
              <button
                className={`rounded-full px-3 py-1 text-sm ${!filter ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}
                onClick={() => setFilter(null)}
              >
                All ({items.length})
              </button>
              {categoriesInUse.map((c) => (
                <button
                  key={c}
                  className={`rounded-full px-3 py-1 text-sm ${filter === c ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </>
          )}
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ＋ Add a {noun}
          </button>
        )}
      </div>

      {showForm && (
        <AddLinkForm
          kind={kind}
          tripId={tripId}
          userId={userId}
          destinationLabel={destinationLabel}
          onDone={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={items.length ? () => setShowForm(false) : undefined}
        />
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {items.length === 0 && !showForm && (
        <div className="card px-6 py-12 text-center text-stone-500">Nothing here yet.</div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => {
          const href = item.url ?? (kind === "places" ? mapsUrl(item.name, destinationLabel) : null);
          const adder = profileById.get(item.added_by ?? "");
          const canEdit = item.added_by === userId || isLeader;
          const site = item.site_name || hostnameOf(item.url) || (kind === "places" && !item.url ? "Google Maps" : null);
          return (
            <article key={item.id} className="card group flex flex-col overflow-hidden">
              <a
                href={href ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block overflow-hidden"
                title={href ? `Open ${site ?? "link"}` : undefined}
              >
                <Thumb
                  src={item.image_url}
                  label={item.name}
                  className="aspect-[16/10] w-full transition duration-300 group-hover:scale-[1.03]"
                />
                {href && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
                    Open ↗
                  </span>
                )}
                {item.price && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-sm font-semibold text-stone-900 shadow">
                    {item.price}
                  </span>
                )}
              </a>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={href ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 font-semibold text-stone-900 hover:text-brand-700"
                    >
                      {item.name}
                    </a>
                    {site && <p className="truncate text-xs text-stone-500">{site}</p>}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => remove(item)}
                      className="btn btn-ghost -mr-2 -mt-1 px-2 py-1 text-stone-400 hover:text-red-600"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {item.category && (
                  <span className="w-fit rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800">{item.category}</span>
                )}
                {item.notes && <p className="whitespace-pre-line text-sm text-stone-600">{item.notes}</p>}
                <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-stone-500">
                  <Avatar profile={adder} size={20} />
                  Added by {item.added_by === userId ? "you" : displayName(adder)}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AddLinkForm({
  kind,
  tripId,
  userId,
  destinationLabel,
  onDone,
  onCancel,
}: {
  kind: Kind;
  tripId: string;
  userId: string;
  destinationLabel: string | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [category, setCategory] = useState(kind === "places" ? PLACE_CATEGORIES[0] : "");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewedUrl, setPreviewedUrl] = useState<string | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeUrl(raw: string) {
    const v = raw.trim();
    if (!v) return "";
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }

  async function fetchPreview(raw: string) {
    const target = normalizeUrl(raw);
    if (!target || target === previewedUrl) return;
    try {
      new URL(target);
    } catch {
      return;
    }
    setPreviewedUrl(target);
    setLoadingPreview(true);
    setPreviewMsg(null);
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(target)}`);
      const data: LinkPreview & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview failed");
      if (data.title) setName((n) => n || cleanTitle(data.title!));
      if (data.image) setImageUrl(data.image);
      if (data.siteName) setSiteName(data.siteName);
      if (!data.image) setPreviewMsg("Couldn't grab a picture from that site — you can paste an image URL below.");
    } catch {
      setPreviewMsg("Couldn't load a preview for that link — you can still fill things in manually.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let image = imageUrl.trim() || null;
    const finalUrl = normalizeUrl(url) || null;

    // No link and no picture? Try to find a photo of the place on Wikipedia.
    if (!image && !finalUrl && kind === "places") {
      const qs = new URLSearchParams({ name: name.trim(), country: destinationLabel ?? "", strict: "1" });
      const img = await fetch(`/api/city-image?${qs}`).then((r) => r.json()).catch(() => null);
      image = img?.image ?? null;
    }

    const row: Record<string, unknown> = {
      trip_id: tripId,
      name: name.trim(),
      url: finalUrl,
      image_url: image,
      site_name: siteName.trim() || null,
      notes: notes.trim() || null,
      added_by: userId,
    };
    if (kind === "places") row.category = category || null;
    if (kind === "housing") row.price = price.trim() || null;

    const { error } = await createClient().from(kind).insert(row);
    setBusy(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="card grid gap-5 p-5 md:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="link-url">
            {kind === "housing" ? "Listing link (Airbnb, Booking, hotel site…)" : "Link (optional — website, Google Maps, TripAdvisor…)"}
          </label>
          <input
            id="link-url"
            className="input"
            value={url}
            required={kind === "housing"}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={(e) => fetchPreview(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              setTimeout(() => fetchPreview(pasted), 0);
            }}
            placeholder="https://www.airbnb.com/rooms/…"
          />
          {loadingPreview && <p className="mt-1 text-xs text-stone-500">Fetching preview…</p>}
          {previewMsg && <p className="mt-1 text-xs text-amber-700">{previewMsg}</p>}
        </div>
        <div>
          <label className="label" htmlFor="link-name">Name</label>
          <input
            id="link-name"
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "housing" ? "Cozy loft near the old town" : "Time Out Market"}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {kind === "places" ? (
            <div>
              <label className="label" htmlFor="link-cat">Category</label>
              <select id="link-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {PLACE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="link-price">Price</label>
              <input id="link-price" className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$180 / night" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="link-img">Image URL</label>
            <input id="link-img" className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Filled in from the link" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="link-notes">Notes</label>
          <textarea
            id="link-notes"
            className="input min-h-16"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={kind === "housing" ? "Sleeps 6, free cancellation until March" : "Go hungry. Open till midnight."}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy || loadingPreview || !name.trim()}>
            {busy ? "Saving…" : `Add ${kind === "places" ? "place" : "stay"}`}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="hidden md:block">
        <div className="label">Preview</div>
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <Thumb src={imageUrl || null} label={name || "?"} className="aspect-[16/10] w-full" />
          <div className="p-3">
            <div className="line-clamp-2 text-sm font-semibold">{name || "Name"}</div>
            <div className="truncate text-xs text-stone-500">{siteName || hostnameOf(normalizeUrl(url)) || "—"}</div>
          </div>
        </div>
      </div>
    </form>
  );
}

function cleanTitle(t: string) {
  // Trim common " | Site" / " - Site" suffixes, keep it reasonably short
  const cut = t.split(/\s[|–—]\s/)[0].trim();
  return (cut.length > 3 ? cut : t).slice(0, 140);
}
