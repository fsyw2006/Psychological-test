"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "theme";

function getCurrentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function setDocumentTheme(theme: "dark" | "light") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      setDocumentTheme(storedTheme);
      setTheme(storedTheme);
      return;
    }

    setTheme(getCurrentTheme() as "dark" | "light");
  }, []);

  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setDocumentTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <Button
      aria-label="切换深色模式"
      title="切换深色模式"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
