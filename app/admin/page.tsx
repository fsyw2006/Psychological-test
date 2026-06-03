import { redirect } from "next/navigation";
import { AdminDashboard, type AdminStats } from "@/components/admin/admin-dashboard";
import { getCurrentProfile } from "@/lib/auth";
import { assessments } from "@/lib/demo-data";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats(): Promise<AdminStats> {
  if (!hasServiceRoleEnv()) {
    return {
      userTotal: 1280,
      todayNewUsers: 38,
      todayRevenue: 64290,
      orderCount: 412,
      membershipCount: 156,
      completionRate: 73,
      hotTests: assessments.slice(0, 5).map((test, index) => ({
        name: test.title,
        value: 120 - index * 16
      }))
    };
  }

  const supabase = createSupabaseServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [users, newUsers, orders, paidOrders, memberships, tests] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString()),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("amount_cents").eq("status", "PAID"),
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE"),
    supabase
      .from("tests")
      .select("title,completion_count")
      .eq("status", "PUBLISHED")
      .order("completion_count", { ascending: false })
      .limit(5)
  ]);

  return {
    userTotal: users.count || 0,
    todayNewUsers: newUsers.count || 0,
    todayRevenue:
      paidOrders.data?.reduce((sum, order) => sum + Number(order.amount_cents || 0), 0) || 0,
    orderCount: orders.count || 0,
    membershipCount: memberships.count || 0,
    completionRate: 73,
    hotTests:
      tests.data?.map((test) => ({
        name: test.title,
        value: test.completion_count
      })) || []
  };
}

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");
  const stats = await getStats();
  return <AdminDashboard stats={stats} />;
}
