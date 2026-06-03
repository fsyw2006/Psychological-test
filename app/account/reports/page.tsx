import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyReportsPage() {
  const profile = await getCurrentProfile();
  let rows: any[] = [];

  if (profile && hasServiceRoleEnv()) {
    try {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase
        .from("results")
        .select("id,created_at,type,is_unlocked,score,max_score,tests(title,slug)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      rows = data || [];
    } catch (error) {
      console.error("Failed to load account reports", error);
    }
  }

  return (
    <section className="section-shell">
      <div className="mb-8">
        <p className="eyebrow">我的报告</p>
        <h1 className="mobile-title mt-2">已生成报告</h1>
      </div>
      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="glass-panel">
              <CardHeader className="mobile-card-header">
                <div className="min-w-0">
                  <CardTitle>{row.tests?.title}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDate(row.created_at)} · {row.score}/{row.max_score}
                  </p>
                </div>
                <Badge className="w-fit" variant={row.is_unlocked ? "soft" : "outline"}>
                  {row.is_unlocked ? <Unlock className="mr-1 size-3" /> : <Lock className="mr-1 size-3" />}
                  {row.is_unlocked ? "已解锁" : "基础报告"}
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
      ) : (
        <div className="glass-panel rounded-lg p-8 text-center">
          <p className="text-muted-foreground">完成一次测评后，报告会出现在这里。</p>
          <Button asChild className="mt-5">
            <Link href="/tests">开始测评</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
