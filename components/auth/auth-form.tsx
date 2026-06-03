"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getFriendlyAuthError(error?: string) {
  const message = (error || "").toLowerCase();

  if (message.includes("email rate limit")) {
    return "邮件发送太频繁了。Supabase 免费内置邮件服务额度较低，请稍后再试，或在 Supabase 配置自定义 SMTP 邮箱服务。";
  }

  if (message.includes("already registered") || message.includes("already exists")) {
    return "这个邮箱已经注册过了，请直接登录，或换一个邮箱测试。";
  }

  if (message.includes("password")) {
    return "密码不符合要求，请使用至少 8 位字符，建议包含字母和数字。";
  }

  if (message.includes("invalid email")) {
    return "邮箱格式不正确，请检查后再试。";
  }

  return error || "操作失败，请稍后再试。";
}

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

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, next })
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        needsEmailConfirmation?: boolean;
      } | null;

      if (!response.ok || result?.error) {
        setMessage(getFriendlyAuthError(result?.error));
        return;
      }

      if (mode === "register" && result?.needsEmailConfirmation) {
        setMessage("注册邮件已发送，请打开邮箱完成确认。");
        return;
      }

      router.refresh();
      router.push(next);
    } catch {
      setMessage("网络请求失败，请刷新页面后再试。");
    } finally {
      setLoading(false);
    }
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
