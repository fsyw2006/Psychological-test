"use client";

import { createBrowserClient } from "@supabase/ssr";

const fallbackSupabaseUrl = "https://wrtgytkjnfvmmmkeltob.supabase.co";
const fallbackAnonKey = "sb_publishable_1ezAkyKuBpW3uMf5WyQblA_FQXGENrd";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey;

  if (!url || !anonKey) {
    throw new Error("Supabase browser environment variables are missing.");
  }

  return createBrowserClient(url, anonKey);
}
