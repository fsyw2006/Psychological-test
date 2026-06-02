import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase 环境变量未配置" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const next = typeof body?.next === "string" ? body.next : "/account";

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
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
    return NextResponse.json({ error: error?.message || "注册失败" }, { status: 400 });
  }

  return NextResponse.json(
    {
      needsEmailConfirmation: !data.session,
      user: {
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split("@")[0]
      }
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
