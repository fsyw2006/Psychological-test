"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, Library, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/tests", label: "测评中心", icon: LayoutGrid },
  { href: "/articles", label: "心理文章", icon: Library },
  { href: "/membership", label: "会员中心", icon: UserRound }
];

type HeaderUser = {
  email: string;
  name?: string | null;
};

function getDisplayName(user: HeaderUser | null) {
  if (!user) return "";
  return user.name || user.email.split("@")[0] || "我的小屋";
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getUser().then(({ data }) => {
        if (!mounted) return;
        const currentUser = data.user;
        setUser(
          currentUser?.email
            ? {
                email: currentUser.email,
                name:
                  typeof currentUser.user_metadata?.name === "string"
                    ? currentUser.user_metadata.name
                    : null
              }
            : null
        );
        setAuthReady(true);
      });

      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user;
        setUser(
          currentUser?.email
            ? {
                email: currentUser.email,
                name:
                  typeof currentUser.user_metadata?.name === "string"
                    ? currentUser.user_metadata.name
                    : null
              }
            : null
        );
        setAuthReady(true);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      setAuthReady(true);
      return () => {
        mounted = false;
      };
    }
  }, []);

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      setUser(null);
      setOpen(false);
      router.refresh();
      router.push("/");
    }
  }
