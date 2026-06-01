import { articles, assessmentCategories, assessments } from "@/lib/demo-data";
import { ensureContentSeeded } from "@/lib/bootstrap";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Article, Assessment, AssessmentQuestion } from "@/lib/types";
import { safeJson } from "@/lib/utils";

export const allowedAssessmentSlugs = [
  "mbti-lite",
  "enneagram",
  "disc",
  "eysenck-personality",
  "phq-9",
  "gad-7",
  "stress-index",
  "sleep-quality",
  "holland-career",
  "eq-test",
  "love-languages",
  "attachment-style",
  "love-attitude",
  "social-anxiety",
  "interpersonal-skills"
] as const;

const allowedAssessmentSet = new Set<string>(allowedAssessmentSlugs);

function visibleAssessments(list: Assessment[]) {
  return list.filter((test) => allowedAssessmentSet.has(test.slug));
}

type QuestionRow = {
  id: string;
  title: string;
  helper: string | null;
  type: "SINGLE" | "MULTIPLE" | "LIKERT";
  required: boolean;
  min: number | null;
  max: number | null;
  dimension: string | null;
  options: unknown;
};

function normalizeQuestion(row: QuestionRow): AssessmentQuestion {
  return {
    id: row.id,
    title: row.title,
    helper: row.helper || undefined,
    type:
      row.type === "SINGLE" ? "single" : row.type === "MULTIPLE" ? "multiple" : "likert",
    required: row.required,
    min: row.min || undefined,
    max: row.max || undefined,
    dimension: row.dimension || undefined,
    options: safeJson(row.options, [])
  };
}

function normalizeTest(row: Record<string, any>): Assessment {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || "",
    categorySlug: row.categories?.slug || "personality",
    category: row.categories?.name || "测评",
    description: row.description,
    estimatedMinutes: row.estimated_minutes,
    isPremium: row.is_premium,
    priceCents: row.price_cents,
    tags: row.tags || [],
    scoring: safeJson(row.scoring, { kind: "sum" }),
    questions: (row.questions || [])
      .sort((a: any, b: any) => a.order - b.order)
      .map(normalizeQuestion),
    reportTemplates: safeJson(row.report_templates, {})
  };
}

export async function getAssessmentCatalog() {
  if (!hasServiceRoleEnv()) {
    return visibleAssessments(assessments);
  }

  await ensureContentSeeded();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tests")
    .select("*, categories(slug,name), questions(*)")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: true });

  if (error || !data?.length) return visibleAssessments(assessments);
  return visibleAssessments(data.map(normalizeTest));
}

export async function getAssessmentBySlug(slug: string) {
  if (!allowedAssessmentSet.has(slug)) return null;

  if (!hasServiceRoleEnv()) {
    return assessments.find((test) => test.slug === slug) || null;
  }

  await ensureContentSeeded();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tests")
    .select("*, categories(slug,name), questions(*)")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .single();

  if (error || !data) {
    return assessments.find((test) => test.slug === slug) || null;
  }

  return normalizeTest(data);
}

export async function getCategories() {
  if (!hasServiceRoleEnv()) return assessmentCategories;

  await ensureContentSeeded();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug,name,description")
    .eq("type", "TEST")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return assessmentCategories;
  return data.map((item) => ({
    slug: item.slug,
    name: item.name,
    description: item.description || ""
  }));
}

export async function getArticles() {
  if (!hasServiceRoleEnv()) return articles;

  await ensureContentSeeded();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*, categories(name)")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false });

  if (error || !data?.length) return articles;
  return data.map(
    (item): Article => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      category: item.categories?.name || "心理文章",
      tags: item.tags || [],
      readingMinutes: item.reading_minutes,
      publishedAt: item.published_at || item.created_at
    })
  );
}

export async function getArticleBySlug(slug: string) {
  const list = await getArticles();
  return list.find((article) => article.slug === slug) || null;
}
