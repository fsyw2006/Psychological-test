import { NextResponse } from "next/server";
import { getPricingConfig } from "@/lib/pricing";

export async function GET() {
  const pricing = await getPricingConfig();
  return NextResponse.json({ pricing });
}
