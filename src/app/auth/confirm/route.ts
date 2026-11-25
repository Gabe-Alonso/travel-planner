import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// Optional: used if you switch Supabase email templates to the token_hash style
// ({{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email), which works across devices.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(type === "recovery" ? "/profile?reset=1" : next, origin));
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=" + encodeURIComponent("That link was invalid or expired."), origin),
  );
}
