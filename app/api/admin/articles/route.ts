import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { sanitizeHtml, sanitizeText } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  excerpt: z.string().min(2),
  content: z.string().min(2),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([])
});

export async function POST(request: NextRequest) {
  const admin = await requireAdminProfile();
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "文章参数错误" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      title: sanitizeText(body.data.title, 120),
      slug: sanitizeText(body.data.slug, 120),
      excerpt: sanitizeText(body.data.excerpt, 260),
      content: sanitizeHtml(body.data.content),
      category_id: body.data.categoryId,
      author_id: admin.id,
      tags: body.data.tags.map((tag) => sanitizeText(tag, 30)),
      status: "PUBLISHED",
      reading_minutes: Math.max(1, Math.ceil(body.data.content.length / 500)),
      published_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ article: data });
}
