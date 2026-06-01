import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const settings = await getAiSettings();
  if (!settings.aiChatEnabled) {
    return NextResponse.json({ error: "AI聊天功能未开启" }, { status: 404 });
  }

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!profile || !hasServiceRoleEnv()) {
    return NextResponse.json({ conversation: null, messages: [] });
  }

  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ conversation, messages: messages || [] });
}
