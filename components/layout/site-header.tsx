"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Home, LayoutGrid, Library, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/tests", label: "测评中心", icon: LayoutGrid },
  { href: "/articles", label: "心理文章", icon: Library },
  { href: "/membership", label: "会员中心", icon: UserRound }
];

type HeaderUser = {
  email: string;
  name?: string | null;
};

type SupabaseAuthUser = {
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function toHeaderUser(authUser?: SupabaseAuthUser | null): HeaderUser | null {
  if (!authUser?.email) return null;

  const metaName = authUser.user_metadata?.name || authUser.user_metadata?.full_name;

  return {
    email: authUser.email,
    name: typeof metaName === "string" ? metaName : null
  };
}

export function SiteHeader({ initialUser = null }: { initialUser?: HeaderUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(initialUser);
  const [ready, setReady] = useState(Boolean(initialUser));
  const [aiChatEnabled, setAiChatEnabled] = useState(false);
  const name = user?.name || user?.email.split("@")[0] || "我的小屋";
  const navItems = aiChatEnabled
    ? [...baseNavItems, { href: "/chat", label: "AI 聊天", icon: Bot }]
    : baseNavItems;

  useEffect(() => {
    let alive = true;

    fetch("/api/ai/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { aiChatEnabled?: boolean } | null) => {
        if (alive) setAiChatEnabled(Boolean(data?.aiChatEnabled));
      })
      .catch(() => {
        if (alive) setAiChatEnabled(false);
      });

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: HeaderUser | null } | null) => {
        if (!alive) return;
        if (data?.user?.email) setUser(data.user);
        else if (!initialUser) setUser(null);
        setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      });

    try {
      const supabase = createSupabaseBrowserClient();

      const setAuthUser = (authUser?: SupabaseAuthUser | null, forceClear = false) => {
        if (!alive) return;

        const nextUser = toHeaderUser(authUser);
        if (nextUser) setUser(nextUser);
        else if (forceClear) setUser(null);
        setReady(true);
      };

      supabase.auth.getUser().then(({ data }) => setAuthUser(data.user));

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        setAuthUser(session?.user, event === "SIGNED_OUT");
      });

      return () => {
        alive = false;
        data.subscription.unsubscribe();
      };
    } catch {
      setReady(true);
      return () => {
        alive = false;
      };
    }
  }, [initialUser]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    setOpen(false);
    router.refresh();
    router.push("/");
  }

  const authButtons = ready && user ? (
    <>
      <Button asChild variant="glass" size="sm">
        <Link href="/account">
          <UserRound className="size-4" />
          {name}
        </Link>
      </Button>
      <Button variant="ghost" size="icon" aria-label="退出登录" onClick={signOut}>
        <LogOut className="size-4" />
      </Button>
    </>
  ) : (
    <Button asChild variant="glass" size="sm">
      <Link href="/auth/login">登录注册</Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/35 bg-background/72 backdrop-blur-2xl dark:border-white/10">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2" aria-label="心灵小屋首页">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-soft">
            SH
          </span>
          <span className="text-base font-semibold">心灵小屋</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {authButtons}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="打开导航"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden">
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}

            {ready && user ? (
              <>
                <Button asChild className="mt-2">
                  <Link href="/account" onClick={() => setOpen(false)}>
                    <UserRound className="size-4" />
                    {name}
                  </Link>
                </Button>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="size-4" />
                  退出登录
                </Button>
              </>
            ) : (
              <Button asChild className="mt-2">
                <Link href="/auth/login" onClick={() => setOpen(false)}>
                  登录注册
                </Link>
              </Button>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
