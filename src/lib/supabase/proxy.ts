import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/utils";

const PUBLIC_PATHS = ["/login", "/auth", "/privacy", "/terms"];

export async function updateSession(request: NextRequest) {
  // Explain misconfiguration clearly instead of failing with a generic 500.
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    return new NextResponse(
      `Wayfarers is not configured yet.\n\nMissing environment variables: ${missing.join(", ")}\n\n` +
        "Add them in Vercel → Project → Settings → Environment Variables (for Production), then redeploy.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not put code between createServerClient and getUser(): it refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user && !isPublic && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (user && pathname === "/login") {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}
