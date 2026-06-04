import { NextResponse } from "next/server";
import { getPublicPaymentChannels } from "@/lib/payments/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const channels = await getPublicPaymentChannels();

  return NextResponse.json(
    {
      channels,
      hasEnabledChannel: channels.length > 0
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
