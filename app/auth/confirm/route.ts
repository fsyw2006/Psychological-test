import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { setFallbackSessionCookie } from "@/lib/auth-session-cookie";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
    const next = request.nextUrl.searchParams.get("next") || "/account";
    const redirectTo = new URL(next, request.url);

    if (tokenHash && type && hasSupabaseEnv()) {
      const { supabase, applyCookies } = await createSupabaseRouteClient();
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash
      });

      if (!error) {
        const response = NextResponse.redirect(redirectTo);
        setFallbackSessionCookie(response, data.session);
        return applyCookies(response);
      }
    }
  } catch (error) {
    console.error("Failed to confirm Supabase email", error);
  }

  return NextResponse.redirect(new URL("/auth/login", request.url));
}
