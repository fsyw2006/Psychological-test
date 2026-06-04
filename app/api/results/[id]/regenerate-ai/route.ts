import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import { aiRetryCooldownSeconds, generatePersonalizedReportDetailed } from "@/lib/ai-report";
import { getAssessmentBySlug } from "@/lib/content";
import { hasServiceRoleEnv } from "@/lib/env";
import { scoreAssessment } from "@/lib/scoring";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { safeJson } from "@/lib/utils";
import type { AssessmentAnswerInput, ReportTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fallbackAdvanced(summary = ""): ReportTemplate {
  return {
    title: "高级报告",
    summary,
    traits: [],
    strengths: [],
    risks: [],
    growth: [],
    careers: [],
    relationships: []
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (!hasServiceRoleEnv() || !profile) {
    return NextResponse.json({ error: "请先登录后再重新生成报告" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("results")
    .select("*, tests(slug)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  if (data.user_id !== profile.id && profile.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问该报告" }, { status: 403 });
  }

  if (!data.is_unlocked) {
    return NextResponse.json({ error: "请先解锁高级报告后再使用 AI 重新生成" }, { status: 402 });
  }

  const testSlug = data.tests?.slug;
  const test = testSlug ? await getAssessmentBySlug(testSlug) : null;
  if (!test) {
    return NextResponse.json({ error: "测评配置不存在，无法重新生成" }, { status: 404 });
  }

  const { data: answerRows } = await supabase
    .from("answers")
    .select("question_id,values")
    .eq("result_id", id);

  const answers: AssessmentAnswerInput[] = (answerRows || []).map((answer) => ({
    questionId: String(answer.question_id),
    values: Array.isArray(answer.values) ? answer.values.map(String) : []
  }));

  const scored = {
    ...scoreAssessment(test, answers, true),
    id: data.id,
    createdAt: data.created_at
  };
  const settings = await getAiSettings();
  const currentAdvanced = safeJson<ReportTemplate>(
    data.advanced_report,
    fallbackAdvanced(data.summary || "")
  );
  const currentAiStatus = currentAdvanced.aiStatus;

  if (
    currentAdvanced.generatedByAi ||
    currentAdvanced.source === "ai" ||
    currentAiStatus?.status === "generated"
  ) {
    return NextResponse.json(
      { error: "这份报告已经成功生成过 AI 报告，不能再次生成。" },
      { status: 409 }
    );
  }

  const attemptedAt = currentAiStatus?.attemptedAt
    ? Date.parse(currentAiStatus.attemptedAt)
    : 0;
  const cooldownMs = aiRetryCooldownSeconds() * 1000;

  if (attemptedAt && Date.now() - attemptedAt < cooldownMs) {
    const retryAfter = Math.max(1, Math.ceil((cooldownMs - (Date.now() - attemptedAt)) / 1000));

    return NextResponse.json(
      {
        error: `AI 报告刚刚生成失败，请等待 ${retryAfter} 秒后再试。`,
        retryAfter
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter)
        }
      }
    );
  }

  const generation = await generatePersonalizedReportDetailed({
    settings,
    test,
    answers,
    result: scored
  });
  const aiStatus = {
    status: generation.status,
    reason: generation.status === "generated" ? undefined : generation.reason,
    provider: generation.provider,
    model: generation.model,
    attemptedAt: generation.attemptedAt
  };
  const nextAdvanced =
    generation.status === "generated"
      ? {
          ...generation.report,
          aiStatus
        }
      : {
          ...currentAdvanced,
          aiStatus
        };

  const { error: updateError } = await supabase
    .from("results")
    .update({
      summary: generation.status === "generated" ? nextAdvanced.summary : data.summary,
      advanced_report: nextAdvanced
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: generation.status === "generated",
    status: generation.status,
    reason: generation.status === "generated" ? "" : generation.reason
  });
}
