import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssessmentPlayer } from "@/components/assessment/assessment-player";
import { getAssessmentBySlug } from "@/lib/content";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = await getAssessmentBySlug(slug);
  return {
    title: test?.title || "心理测评",
    description: test?.description || "在线心理测评"
  };
}

export default async function AssessmentPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const test = await getAssessmentBySlug(slug);
  if (!test) notFound();
  const showDisclaimer =
    test.categorySlug === "emotion" || ["social-anxiety"].includes(test.slug);

  return (
    <section className="section-shell">
      <AssessmentPlayer test={test} />
      {showDisclaimer ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-lg border border-border bg-background/60 p-4 text-sm leading-7 text-muted-foreground">
          本测评结果仅用于自我了解与心理健康科普参考，不能替代专业医疗诊断。如你正在经历严重情绪困扰、自伤或伤害他人的想法，请立即联系当地急救电话、专业心理咨询机构或身边可信赖的人。
        </div>
      ) : null}
    </section>
  );
}
