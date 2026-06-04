import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAiSettings,
  isAiProvider,
  type AiProvider
} from "@/lib/ai-settings";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import {
  fetchOpenAiCompatibleModels,
  isOpenAiCompatibleProvider,
  resolveOpenAiBaseUrl
} from "@/lib/ai-openai-compatible";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  aiProvider: z.string().optional(),
  aiBaseUrl: z.string().optional().nullable(),
  aiApiKey: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const settings = await getAiSettings();
  const provider: AiProvider = isAiProvider(body.data.aiProvider)
    ? body.data.aiProvider
    : settings.aiProvider;

  if (!isOpenAiCompatibleProvider(provider)) {
    return NextResponse.json(
      { error: "当前服务商不是 OpenAI 兼容协议，无法自动获取模型。" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = resolveOpenAiBaseUrl(
      provider,
      body.data.aiBaseUrl || settings.aiBaseUrl
    );
    const apiKey = body.data.aiApiKey || settings.aiApiKey;
    const models = await fetchOpenAiCompatibleModels({
      provider,
      baseUrl,
      apiKey
    });

    return NextResponse.json({
      models,
      baseUrl
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取模型列表失败" },
      { status: 400 }
    );
  }
}
