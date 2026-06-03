import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { assessments } from "@/lib/demo-data";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TestHistoryRow = {
  id: string;
  createdAt: string;
  title: string;
  slug?: string;
  category: string;
  isDemo?: boolean;
};

function safeFormatDate(value?: string | Date | null) {
  if (!value) return "最近";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "最近";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function demoRows(): TestHistoryRow[] {
  return assessments.slice(0, 3).map((test, index) => ({
    id: `demo-${test.slug}`,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    title: test.title,
    slug: test.slug,
    category: test.category,
    isDemo: true
  }));
}

async function getRows(): Promise<TestHistoryRow[]> {
  const profile = await getCurrentProfile();

  if (!profile || !hasServiceRoleEnv()) {
    return demoRows();
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data: results, error: resultError } = await supabase
      .from("results")
      .select("id, created_at, type, test_id")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (resultError || !results?.length) {
      return demoRows();
    }

    const testIds = Array.from(
      new Set(
        results
          .map((row) => (typeof row.test_id === "string" ? row.test_id : ""))
          .filter(Boolean)
      )
    );

    const testMap = new Map<string, { title?: string; slug?: string }>();

    if (testIds.length) {
      const { data: tests } = await supabase
        .from("tests")
        .select("id, title, slug")
        .in("id", testIds);

      tests?.forEach((test) => {
        if (typeof test.id === "string") {
          testMap.set(test.id, {
            title: typeof test.title === "string" ? test.title : undefined,
            slug: typeof test.slug === "string" ? test.slug : undefined
          });
        }
      });
    }

    return results.map((row) => {
      const test = testMap.get(row.test_id);

      return {
        id: row.id,
        createdAt: row.created_at,
        title: test?.title || row.type || "心理测评",
        slug: test?.slug,
        category: row.type || "已完成"
      };
    });
  } catch (error) {
    console.error("Failed to load account tests", error);
    return demoRows();
  }
}

export default async function MyTestsPage() {
  const rows = await getRows();

  return (
    <section className="section-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">我的测评</p>
          <h1 className="mobile-title mt-2">历史测评</h1>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/tests">继续测评</Link>
        </Button>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id} className="glass-panel">
            <CardHeader className="mobile-card-header">
              <div className="min-w-0">
                <CardTitle>{row.title}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  {safeFormatDate(row.createdAt)}
                </p>
              </div>
              <Badge className="w-fit" variant="soft">
                {row.category}
              </Badge>
            </CardHeader>
            <CardContent>
              <Button asChild variant="glass" size="sm">
                <Link href={row.isDemo && row.slug ? `/tests/${row.slug}` : `/reports/${row.id}`}>
                  {row.isDemo ? "开始测评" : "查看报告"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
