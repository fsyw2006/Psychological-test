import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings, maskAiKey, saveAiSettings } from "@/lib/ai-settings";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";

export async function GET() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const settings = await getAiSettings();
  return NextResponse.json({
    settings: {
      ...settings,
      aiApiKey: "",
      aiApiKeyMasked: maskAiKey(settings.aiApiKey)
    },
    storage: hasServiceRoleEnv() ? "database" : "memory"
  });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const settings = await saveAiSettings(body);
    return NextResponse.json({
      ok: true,
      settings: {
        ...settings,
        aiApiKey: "",
        aiApiKeyMasked: maskAiKey(settings.aiApiKey)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}
