import type { MetadataRoute } from "next";
import { getArticles, getAssessmentCatalog } from "@/lib/content";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tests, articles] = await Promise.all([getAssessmentCatalog(), getArticles()]);
  const staticRoutes = ["", "/tests", "/articles", "/membership", "/auth/login"].map(
    (route) => ({
      url: absoluteUrl(route || "/"),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8
    })
  );

  return [
    ...staticRoutes,
    ...tests.map((test) => ({
      url: absoluteUrl(`/tests/${test.slug}`),
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/articles/${article.slug}`),
      lastModified: new Date(article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6
    }))
  ];
}
