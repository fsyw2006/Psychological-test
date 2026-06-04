import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { sanitizeHtml, sanitizeText } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  excerpt: z.string().min(2),
  content: z.string().min(2),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([])
});

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || `article-${Date.now()}`;
}

async function uniqueArticleSlug(supabase: SupabaseServiceClient, value: string) {
  const base = slugify(value);

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
  }

  return `${base}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminProfile();
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "文章参数错误" }, { status: 400 });
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "文章发布失败：Cloudflare 缺少 SUPABASE_SERVICE_ROLE_KEY，无法写入 Supabase 数据库。"
      },
      { status: 503 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const title = sanitizeText(body.data.title, 120);
  const content = sanitizeHtml(body.data.content);
  const slug = await uniqueArticleSlug(supabase, body.data.slug || title);
  const { data, error } = await supabase
    .from("articles")
    .insert({
      title,
      slug,
      excerpt: sanitizeText(body.data.excerpt, 260),
      content,
      category_id: body.data.categoryId,
      author_id: admin.id,
      tags: body.data.tags.map((tag) => sanitizeText(tag, 30)),
      status: "PUBLISHED",
      reading_minutes: Math.max(1, Math.ceil(content.length / 500)),
      published_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath(`/articles/${slug}`);

  return NextResponse.json({ article: data });
}
