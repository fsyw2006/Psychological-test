import { NextResponse, type NextRequest } from "next/server";
import { setFallbackSessionCookie } from "@/lib/auth-session-cookie";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/account";

  if (code && hasSupabaseEnv()) {
    const { supabase, applyCookies } = await createSupabaseRouteClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const response = NextResponse.redirect(new URL(next, request.url));
    setFallbackSessionCookie(response, data.session);
    return applyCookies(response);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
