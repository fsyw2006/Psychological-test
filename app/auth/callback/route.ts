import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/account";

  if (code && hasSupabaseEnv()) {
    const { supabase, applyCookies } = await createSupabaseRouteClient();
    await supabase.auth.exchangeCodeForSession(code);
    return applyCookies(NextResponse.redirect(new URL(next, request.url)));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
