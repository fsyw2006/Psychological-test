import { NextResponse } from "next/server";
import { clearFallbackSessionCookie } from "@/lib/auth-session-cookie";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  if (hasSupabaseEnv()) {
    const { supabase, applyCookies } = await createSupabaseRouteClient();
    await supabase.auth.signOut();
    clearFallbackSessionCookie(response);
    return applyCookies(response);
  }

  clearFallbackSessionCookie(response);
  return response;
}
