"use client";

import { useEffect, type ReactNode } from "react";

const THEME_STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function resolveTheme(theme: string | null, prefersDark: boolean) {
  if (theme === "dark" || theme === "light") return theme;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);

    function syncTheme() {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      applyTheme(resolveTheme(storedTheme, media.matches));
    }

    syncTheme();

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) syncTheme();
    };

    const onPreferenceChange = () => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) syncTheme();
    };

    window.addEventListener("storage", onStorage);
    media.addEventListener("change", onPreferenceChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      media.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <>{children}</>;
}
