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

async function loadServerUser() {
  const response = await fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "include"
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => null)) as {
    user?: HeaderUser | null;
  } | null;

  return data?.user?.email ? data.user : null;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

    async function refreshUserFromServer(allowBrowserRefresh = false) {
      try {
        const serverUser = await loadServerUser();
        if (!alive) return;

        if (serverUser) {
          setUser(serverUser);
          setReady(true);
          return;
        }

        if (allowBrowserRefresh) {
          const supabase = createSupabaseBrowserClient();
          const {
            data: { session }
          } = await supabase.auth.getSession();

          if (session) {
            await Promise.race([supabase.auth.refreshSession(), wait(1200)]);
            const syncedUser = await loadServerUser();
            if (!alive) return;

            if (syncedUser) {
              setUser(syncedUser);
              setReady(true);
              return;
            }
          }
        }

        if (!initialUser) setUser(null);
        setReady(true);
      } catch {
        if (!alive) return;
        if (!initialUser) setUser(null);
        setReady(true);
      }
    }

    void refreshUserFromServer(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setReady(true);
          return;
        }

        window.setTimeout(() => {
          void refreshUserFromServer(event === "SIGNED_IN" || event === "INITIAL_SESSION");
        }, 0);
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

  useEffect(() => {
    let alive = true;

    const refreshAiStatus = () => {
      fetch("/api/ai/status", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { aiChatEnabled?: boolean } | null) => {
          if (alive) setAiChatEnabled(Boolean(data?.aiChatEnabled));
        })
        .catch(() => {
          if (alive) setAiChatEnabled(false);
        });
    };

    refreshAiStatus();
    window.addEventListener("soul-house:ai-settings-updated", refreshAiStatus);

    return () => {
      alive = false;
      window.removeEventListener("soul-house:ai-settings-updated", refreshAiStatus);
    };
  }, [pathname]);

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
