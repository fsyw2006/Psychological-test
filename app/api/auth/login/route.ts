import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function getFriendlyLoginError(message?: string) {
  const text = (message || "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "邮箱或密码不正确，请检查后再试。";
  }

  if (text.includes("email not confirmed")) {
    return "邮箱还没有完成确认，请先打开邮箱里的确认链接。";
  }

  if (text.includes("email logins are disabled") || text.includes("provider is disabled")) {
    return "邮箱登录方式还没有开启，请在 Supabase 的 Email provider 中开启。";
  }

  if (text.includes("rate limit") || text.includes("too many")) {
    return "登录请求太频繁了，请稍后再试。";
  }

  return message || "登录失败，请稍后再试。";
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv()) {
      return noStoreJson({ error: "Supabase 环境变量未配置" }, 500);
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return noStoreJson({ error: "请输入邮箱和密码" }, 400);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user?.email) {
      return noStoreJson({ error: getFriendlyLoginError(error?.message) }, 401);
    }

    return noStoreJson({
      user: {
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split("@")[0]
      }
    });
  } catch (error) {
    console.error("Login API failed", error);
    return noStoreJson({ error: "登录服务暂时不可用，请稍后再试。" }, 503);
  }
}
