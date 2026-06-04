import { NextResponse } from "next/server";
import { getAiSettings } from "@/lib/ai-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const settings = await getAiSettings();

  return NextResponse.json(
    {
      aiChatEnabled: settings.aiChatEnabled
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
