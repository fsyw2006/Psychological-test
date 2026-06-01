import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const profile = await getCurrentProfile();

  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!hasServiceRoleEnv() || !profile) {
    return NextResponse.json({ favorited: true, mode: "demo" });
  }

  const supabase = createSupabaseServiceClient();
  const { data: article } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("article_favorites")
    .select("id")
    .eq("user_id", profile.id)
    .eq("article_id", article.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("article_favorites").delete().eq("id", existing.id);
    return NextResponse.json({ favorited: false });
  }

  await supabase.from("article_favorites").insert({
    user_id: profile.id,
    article_id: article.id
  });

  return NextResponse.json({ favorited: true });
}
