import Link from "next/link";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyMembershipPage() {
  const profile = await getCurrentProfile();
  let membership: any = null;

  if (profile && hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", profile.id)
      .eq("status", "ACTIVE")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    membership = data;
  }

  return (
    <section className="section-shell">
      <div className="mb-8">
        <p className="eyebrow">会员状态</p>
        <h1 className="mobile-title mt-2">会员中心</h1>
      </div>
      <Card className="glass-panel max-w-2xl">
        <CardHeader>
          <Crown className="mb-3 size-7 text-primary" />
          <CardTitle>{membership ? `${membership.plan} 会员` : "免费版"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            {membership?.ends_at
              ? `有效期至 ${formatDate(membership.ends_at)}`
              : "每日 1 次测评，可查看基础报告。"}
          </p>
          <Button asChild className="mt-6">
            <Link href="/membership">续费会员</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
