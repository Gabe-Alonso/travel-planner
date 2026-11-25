import { NextResponse, type NextRequest } from "next/server";

// Finds a representative photo for a city using Wikipedia's page images.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const name = (p.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ image: null });
  const queries = [
    [name, p.get("region"), p.get("country")].filter(Boolean).join(" "),
    [name, p.get("country")].filter(Boolean).join(" "),
    // 'strict' (used for places) skips the bare-name search, which can match unrelated pages
    ...(p.get('strict') ? [] : [name]),
  ];

  for (const q of [...new Set(queries)]) {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "search",
      gsrsearch: q,
      gsrlimit: "1",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "800",
    }).toString();
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "TripPlannerApp/1.0 (trip planning web app)" },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86400 },
      });
      const json = await res.json();
      const image: string | undefined = json?.query?.pages?.[0]?.thumbnail?.source;
      if (image) {
        return NextResponse.json({ image }, { headers: { "cache-control": "public, max-age=86400" } });
      }
    } catch {
      // try the next query
    }
  }
  return NextResponse.json({ image: null });
}
