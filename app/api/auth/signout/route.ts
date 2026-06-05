import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function POST() {
  if (hasSupabaseEnv()) {
    const { supabase, applyCookies } = await createSupabaseRouteClient();
    await supabase.auth.signOut();
    return applyCookies(NextResponse.json({ ok: true }));
  }

  return NextResponse.json({ ok: true });
}
