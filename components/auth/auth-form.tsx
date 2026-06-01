"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      router.push(next);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                next
              )}`
            }
          });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "register" && !result.data.session) {
      setMessage("注册邮件已发送，请完成邮箱确认。");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="glass-panel mx-auto max-w-md rounded-lg p-4 sm:p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">使用邮箱进入你的成长档案</p>
      </div>

      <div className="space-y-4">
        {mode === "register" ? (
          <div className="space-y-2">
            <Label htmlFor="name">昵称</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-md border border-border bg-muted/70 px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      <Button className="mt-6 w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Mail />}
        {mode === "login" ? "登录" : "创建账户"}
      </Button>
    </form>
  );
}
