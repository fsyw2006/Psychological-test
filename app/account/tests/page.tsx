import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { assessments } from "@/lib/demo-data";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function MyTestsPage() {
  const profile = await getCurrentProfile();
  let rows: any[] = [];

  if (profile && hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("results")
      .select("id,created_at,type,tests(title,slug,categories(name))")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    rows = data || [];
  }

  if (!rows.length) {
    rows = assessments.slice(0, 3).map((test, index) => ({
      id: test.slug,
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
      type: "示例",
      tests: { title: test.title, slug: test.slug, categories: { name: test.category } }
    }));
  }

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
                <CardTitle>{row.tests?.title}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">{formatDate(row.created_at)}</p>
              </div>
              <Badge className="w-fit" variant="soft">
                {row.tests?.categories?.name || row.type}
              </Badge>
            </CardHeader>
            <CardContent>
              <Button asChild variant="glass" size="sm">
                <Link href={`/reports/${row.id}`}>查看报告</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
