import { NextResponse, type NextRequest } from "next/server";
import { getArticles } from "@/lib/content";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const category = request.nextUrl.searchParams.get("category");
  const articles = await getArticles();
  const filtered = articles.filter((article) => {
    const matchesQuery = query
      ? `${article.title}${article.excerpt}${article.tags.join("")}`
          .toLowerCase()
          .includes(query)
      : true;
    const matchesCategory = category ? article.category === category : true;
    return matchesQuery && matchesCategory;
  });
  return NextResponse.json({ articles: filtered });
}
