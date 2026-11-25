import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LinkPreview } from "@/lib/types";

// Different sites serve Open Graph tags to different crawlers, so we try a couple.
const USER_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
];

const MAX_BYTES = 1_500_000;

function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\[?(::1|fc|fd|fe80)/.test(h)) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}

function parseMeta(html: string) {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      tag.match(new RegExp(`\b${name}\s*=\s*("([^"]*)"|'([^']*)')`, "i"));
    const key = attr("property") ?? attr("name") ?? attr("itemprop");
    const content = attr("content");
    if (key && content) {
      const k = (key[2] ?? key[3]).toLowerCase();
      if (!(k in meta)) meta[k] = decodeEntities(content[2] ?? content[3]);
    }
  }
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const imageSrc = html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i)?.[1];
  return { meta, title: title ? decodeEntities(title) : null, imageSrc };
}

async function fetchHtml(url: string, userAgent: string) {
  const res = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok || !res.body) return { html: null, finalUrl: res.url || url };
  if (isBlockedHost(new URL(res.url || url).hostname)) return { html: null, finalUrl: url };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  reader.cancel().catch(() => {});
  return { html, finalUrl: res.url || url };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = request.nextUrl.searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(target.protocol) || isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  const result: LinkPreview = { url: target.toString(), title: null, description: null, image: null, siteName: null };

  for (const ua of USER_AGENTS) {
    try {
      const { html, finalUrl } = await fetchHtml(target.toString(), ua);
      if (!html) continue;
      const { meta, title, imageSrc } = parseMeta(html);
      const image =
        meta["og:image:secure_url"] ?? meta["og:image"] ?? meta["og:image:url"] ??
        meta["twitter:image"] ?? meta["twitter:image:src"] ?? meta["image"] ?? imageSrc ?? null;

      result.title ??= meta["og:title"] ?? meta["twitter:title"] ?? title ?? null;
      result.description ??= meta["og:description"] ?? meta["twitter:description"] ?? meta["description"] ?? null;
      result.siteName ??= meta["og:site_name"] ?? null;
      if (image && !result.image) {
        try {
          result.image = new URL(image, finalUrl).toString();
        } catch {}
      }
      if (result.image && result.title) break;
    } catch {
      // try next user agent
    }
  }

  return NextResponse.json(result, {
    headers: { "cache-control": "private, max-age=3600" },
  });
}
