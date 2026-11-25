import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// OAuth providers, email confirmations, and password resets land here with a `code`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const providerError = searchParams.get("error_description");

  const toLogin = (msg: string) =>
    NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(msg)}`, origin),
    );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return toLogin(error.message);
  }

  return toLogin(providerError ?? "Sign-in link was invalid or expired. Please try again.");
}
