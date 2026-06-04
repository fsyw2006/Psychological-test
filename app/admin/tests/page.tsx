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
          用户前台做的是正式题库，保证评分稳定。后台可以用 AI 生成题目草稿，管理员检查后再保存为正式题目。
        </p>
      </div>
      <TestManagementPanel tests={tests} categories={categories} />
    </div>
  );
}
