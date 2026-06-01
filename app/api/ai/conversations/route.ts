import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const settings = await getAiSettings();
  if (!settings.aiChatEnabled) {
    return NextResponse.json({ error: "AI聊天功能未开启" }, { status: 404 });
  }

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!profile || !hasServiceRoleEnv()) {
    return NextResponse.json({ conversations: [] });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ conversations: data || [] });
}
