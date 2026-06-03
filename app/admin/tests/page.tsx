import { redirect } from "next/navigation";
import { TestManagementPanel } from "@/components/admin/test-management-panel";
import { getCurrentProfile } from "@/lib/auth";
import { getAssessmentCatalog, getCategories } from "@/lib/content";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTestsPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");
  const [tests, categories] = await Promise.all([getAssessmentCatalog(), getCategories()]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">测评管理</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          仅前台展示适合小红书传播的 15 个轻量测评；后台可调整启用状态、分类、标签和预计时间。
        </p>
      </div>
      <TestManagementPanel tests={tests} categories={categories} />
    </div>
  );
}
