import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import { callOpenAiCompatibleChat } from "@/lib/ai-openai-compatible";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { rateLimited } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().min(1).max(2000)
});

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "ai-chat");
  if (limited) return limited;

  const settings = await getAiSettings();
  if (!settings.aiChatEnabled) {
    return NextResponse.json({ error: "AI聊天功能未开启" }, { status: 404 });
  }

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "聊天内容不能为空" }, { status: 400 });
  }

  if (settings.aiProvider !== "mock" && !settings.aiApiKey) {
    return NextResponse.json({ error: "AI API Key 未配置" }, { status: 400 });
  }

  let isMember = false;
  let usedToday = 0;

  if (profile && hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: membership }, { count }] = await Promise.all([
      supabase
        .from("memberships")
        .select("id")
        .eq("user_id", profile.id)
        .eq("status", "ACTIVE")
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .maybeSingle(),
      supabase
        .from("ai_usage_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", today.toISOString())
    ]);

    isMember = Boolean(membership);
    usedToday = count || 0;
  }

  const limit = isMember ? settings.memberChatLimit : settings.freeChatLimit;
  if (usedToday >= limit) {
    return NextResponse.json({ error: "今日 AI 聊天次数已用完" }, { status: 429 });
  }

  let reply =
    "我已收到你的内容。当前 AI 聊天处于测试模式，正式服务开启后将提供更完整的心理陪伴体验。";

  if (settings.aiProvider === "claude") {
    return NextResponse.json(
      { error: "Claude 当前保留为旧 Anthropic 协议；请优先使用 OpenAI 兼容 Base URL。" },
      { status: 501 }
    );
  }

  if (settings.aiProvider !== "mock") {
    try {
      reply = await callOpenAiCompatibleChat({
        settings,
        messages: [
          {
            role: "system",
            content: settings.aiSystemPrompt
          },
          {
            role: "user",
            content: body.data.message
          }
        ],
        temperature: 0.6
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI 服务请求失败" },
        { status: 400 }
      );
    }
  }

  if (profile && hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    await supabase.from("ai_usage_records").insert({
      user_id: profile.id,
      provider: settings.aiProvider,
      model: settings.aiModel,
      token_input: 0,
      token_output: 0,
      total_cost: 0
    });
  }

  return NextResponse.json({
    reply,
    provider: settings.aiProvider,
    model: settings.aiModel
  });
}
