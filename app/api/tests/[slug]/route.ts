import { NextResponse, type NextRequest } from "next/server";
import { getAssessmentBySlug } from "@/lib/content";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const test = await getAssessmentBySlug(slug);

  if (!test) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }

  return NextResponse.json({ test });
}
