import { NextResponse } from "next/server";
import { getPricingConfig } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const pricing = await getPricingConfig();
  return NextResponse.json(
    { pricing },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
