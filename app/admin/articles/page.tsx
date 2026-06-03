import { redirect } from "next/navigation";
import { ArticleEditorForm } from "@/components/admin/article-editor-form";
import { ArticleCard } from "@/components/articles/article-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { getArticles } from "@/lib/content";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminArticlesPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");
  const articles = await getArticles();
  let categoryId: string | undefined;

  if (hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("type", "ARTICLE")
      .limit(1)
      .maybeSingle();
    categoryId = data?.id;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="glass-panel min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>发布文章</CardTitle>
        </CardHeader>
        <CardContent>
          <ArticleEditorForm categoryId={categoryId} />
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
