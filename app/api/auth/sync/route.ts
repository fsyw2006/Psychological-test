import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { setFallbackSessionCookie } from "@/lib/auth-session-cookie";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv()) {
      return noStoreJson({ error: "Supabase 环境变量未配置" }, 500);
    }

    const body = await request.json().catch(() => null);
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

    if (!accessToken) {
      return noStoreJson({ error: "缺少登录凭证" }, 400);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(accessToken);

    if (error || !user?.email) {
      return noStoreJson({ error: "登录凭证无效" }, 401);
    }

    const response = noStoreJson({ ok: true });
    setFallbackSessionCookie(response, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 60 * 60,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      token_type: "bearer",
      user
    });

    return response;
  } catch (error) {
    console.error("Auth sync API failed", error);
    return noStoreJson({ error: "登录同步失败" }, 503);
  }
}
