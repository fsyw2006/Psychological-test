import { NextResponse } from "next/server";
import { getAssessmentCatalog } from "@/lib/content";

export async function GET() {
  const tests = await getAssessmentCatalog();
  return NextResponse.json({ tests });
}
