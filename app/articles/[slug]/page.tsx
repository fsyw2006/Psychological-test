import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/articles/favorite-button";
import { Badge } from "@/components/ui/badge";
import { getArticleBySlug } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  return {
    title: article?.title || "心理文章",
    description: article?.excerpt || "心灵小屋心理文章"
  };
}

export default async function ArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="section-shell">
      <div className="mx-auto max-w-3xl">
        <Badge variant="soft">{article.category}</Badge>
        <h1 className="mobile-title mt-4">{article.title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{article.excerpt}</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{formatDate(article.publishedAt)}</span>
            <span>{article.readingMinutes} 分钟阅读</span>
            {article.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <FavoriteButton slug={article.slug} />
        </div>
        <div className="glass-panel prose prose-neutral mt-8 max-w-none rounded-lg p-6 leading-8 dark:prose-invert">
          {article.content.split("\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}
