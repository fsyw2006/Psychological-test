import { redirect } from "next/navigation";
import { ReportTemplateAdmin } from "@/components/admin/report-template-admin";
import { getCurrentProfile } from "@/lib/auth";
import { getAssessmentCatalog } from "@/lib/content";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReportsPage() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") redirect("/account");

  const tests = await getAssessmentCatalog();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">报告模板管理</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          高级报告全部来自数据库预设模板。这里可以按测评和结果类型编辑模板内容，不调用 AI。
        </p>
      </div>
      <ReportTemplateAdmin
        tests={tests.map((test) => ({
          slug: test.slug,
          title: test.title,
          category: test.category,
          reportTemplates: test.reportTemplates
        }))}
      />
    </div>
  );
}
