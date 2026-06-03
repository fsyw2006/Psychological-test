import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function exists(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      supabaseUrlConfigured: exists(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKeyConfigured: exists(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleConfigured: exists(process.env.SUPABASE_SERVICE_ROLE_KEY),
      mockPaymentEnabled: process.env.MOCK_PAYMENT_ENABLED === "true",
      aiChatEnabled: process.env.AI_CHAT_ENABLED === "true",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
