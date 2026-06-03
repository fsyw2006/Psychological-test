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

function getFriendlyRegisterError(message?: string) {
  const text = (message || "").toLowerCase();

  if (text.includes("email rate limit")) {
    return "邮件发送太频繁了。请稍后再试，或先关闭邮箱确认后再注册。";
  }

  if (text.includes("already registered") || text.includes("already exists")) {
    return "这个邮箱已经注册过了，请直接登录，或换一个邮箱测试。";
  }

  if (text.includes("email signups are disabled") || text.includes("provider is disabled")) {
    return "邮箱注册方式还没有开启，请在 Supabase 的 Email provider 中开启。";
  }

  if (text.includes("password")) {
    return "密码不符合要求，请使用至少 8 位字符，建议包含字母和数字。";
  }

  if (text.includes("invalid email")) {
    return "邮箱格式不正确，请检查后再试。";
  }

  return message || "注册失败，请稍后再试。";
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv()) {
      return noStoreJson({ error: "Supabase 环境变量未配置" }, 500);
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const next = typeof body?.next === "string" ? body.next : "/account";

    if (!email || !password) {
      return noStoreJson({ error: "请输入邮箱和密码" }, 400);
    }

    if (password.length < 8) {
      return noStoreJson({ error: "密码至少需要 8 位字符" }, 400);
    }

    const supabase = await createSupabaseServerClient();
    const origin = new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });

    if (error || !data.user?.email) {
      return noStoreJson({ error: getFriendlyRegisterError(error?.message) }, 400);
    }

    return noStoreJson({
      needsEmailConfirmation: !data.session,
      user: {
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split("@")[0]
      }
    });
  } catch (error) {
    console.error("Register API failed", error);
    return noStoreJson({ error: "注册服务暂时不可用，请稍后再试。" }, 503);
  }
}
