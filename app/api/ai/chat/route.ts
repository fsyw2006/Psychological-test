import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import {
  callOpenAiCompatibleChat,
  type AiChatMessage
} from "@/lib/ai-openai-compatible";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { rateLimited, sanitizeText } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().min(1).max(2000)
});

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type StoredAiMessage = {
  role: "user" | "assistant" | string;
  content: string;
};

function conversationTitle(message: string) {
  return sanitizeText(message, 28) || "新的 AI 聊天";
}

async function getOrCreateConversation({
  supabase,
  userId,
  conversationId,
  message
}: {
  supabase: SupabaseServiceClient;
  userId: string;
  conversationId?: string | null;
  message: string;
}) {
  if (conversationId) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.id) return data.id as string;
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: conversationTitle(message)
    })
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(error?.message || "创建 AI 会话失败");
  return data.id as string;
}

async function loadRecentMessages(supabase: SupabaseServiceClient, conversationId: string) {
  const { data } = await supabase
    .from("ai_messages")
    .select("role,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  return ((data || []) as StoredAiMessage[])
    .reverse()
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map(
      (message): AiChatMessage => ({
        role: message.role as "user" | "assistant",
        content: message.content
      })
    );
}

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
  let conversationId: string | null = null;
  let recentMessages: AiChatMessage[] = [];
  const userMessage = sanitizeText(body.data.message, 2000);
  if (!userMessage) {
    return NextResponse.json({ error: "聊天内容不能为空" }, { status: 400 });
  }

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
        .order("ends_at", { ascending: false, nullsFirst: true })
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_usage_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", today.toISOString())
    ]);

    isMember = Boolean(membership);
    usedToday = count || 0;

    try {
      conversationId = await getOrCreateConversation({
        supabase,
        userId: profile.id,
        conversationId: body.data.conversationId,
        message: userMessage
      });
      recentMessages = await loadRecentMessages(supabase, conversationId);
    } catch (error) {
      console.error("Failed to prepare AI conversation.", error);
    }
  }

  const limit = isMember ? settings.memberChatLimit : settings.freeChatLimit;
  if (usedToday >= limit) {
    return NextResponse.json({ error: "今日 AI 聊天次数已用完" }, { status: 429 });
  }

  let reply =
    "我已收到你的内容。你可以继续把当下的感受、发生的事情和你希望被支持的地方告诉我，我会尽量用温和、清晰的方式陪你梳理。";

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
          ...recentMessages,
          {
            role: "user",
            content: userMessage
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
    await Promise.all([
      conversationId
        ? supabase.from("ai_messages").insert([
            {
              conversation_id: conversationId,
              role: "user",
              content: userMessage,
              token_count: 0
            },
            {
              conversation_id: conversationId,
              role: "assistant",
              content: reply,
              token_count: 0
            }
          ])
        : Promise.resolve(),
      conversationId
        ? supabase
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("user_id", profile.id)
        : Promise.resolve(),
      supabase.from("ai_usage_records").insert({
        user_id: profile.id,
        provider: settings.aiProvider,
        model: settings.aiModel,
        token_input: 0,
        token_output: 0,
        total_cost: 0
      })
    ]);
  }

  return NextResponse.json({
    reply,
    conversationId,
    provider: settings.aiProvider,
    model: settings.aiModel
  });
}
