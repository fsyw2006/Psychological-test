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
          固定模板用于兜底和稳定展示。开启“报告模板 AI 辅助”并配置真实模型后，会员提交测评时会优先生成 AI 个性化高级报告。
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
