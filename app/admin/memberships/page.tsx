import { redirect } from "next/navigation";
import { MembershipAdminPanel } from "@/components/admin/membership-admin-panel";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMembershipsPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  let memberships: any[] = [];
  if (hasServiceRoleEnv()) {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("memberships")
      .select("*, users(email,name)")
      .order("created_at", { ascending: false })
      .limit(100);
    memberships = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">会员管理</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          查看会员用户，支持手动开通、取消会员和核对到期时间。
        </p>
      </div>
      <MembershipAdminPanel initialMemberships={memberships} />
    </div>
  );
}
