import Link from "next/link";
import { Bookmark, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} className="block h-full">
      <Card className="glass-panel h-full min-w-0 overflow-hidden transition-transform hover:-translate-y-1">
        <CardHeader>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Badge variant="soft">{article.category}</Badge>
            <Bookmark className="size-4 text-muted-foreground" />
          </div>
          <CardTitle className="break-words leading-7">{article.title}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{formatDate(article.publishedAt)}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {article.readingMinutes} 分钟
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
