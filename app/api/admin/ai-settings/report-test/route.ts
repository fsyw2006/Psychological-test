import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import { generatePersonalizedReportDetailed } from "@/lib/ai-report";
import { hasSupabaseEnv } from "@/lib/env";
import type { Assessment, AssessmentResult } from "@/lib/types";

const demoTest: Assessment = {
  slug: "ai-report-demo",
  title: "AI 报告测试",
  subtitle: "用于后台测试 AI 个性化报告生成",
  categorySlug: "demo",
  category: "后台测试",
  description: "这是一份用于验证 AI 报告功能是否可用的后台测试测评。",
  estimatedMinutes: 1,
  tags: ["AI测试"],
  scoring: {
    kind: "sum",
    maxScore: 8
  },
  questions: [
    {
      id: "demo-q1",
      title: "最近你更希望提升哪一类状态？",
      type: "single",
      required: true,
      options: [
        { label: "情绪稳定", value: "emotion", score: 4, dimension: "情绪" },
        { label: "行动效率", value: "action", score: 3, dimension: "行动" }
      ]
    }
  ],
  reportTemplates: {}
};

const demoResult: AssessmentResult = {
  id: "ai-report-demo",
  testSlug: demoTest.slug,
  testTitle: demoTest.title,
  category: demoTest.category,
  score: 4,
  maxScore: 8,
  type: "测试类型",
  title: "测试报告",
  summary: "这是一份用于验证 AI 是否能生成个性化报告的测试结果。",
  dimensions: {
    情绪: 4,
    行动: 3
  },
  advanced: {
    title: "模板测试报告",
    summary: "模板兜底内容。",
    traits: ["模板性格特点"],
    strengths: ["模板优势分析"],
    risks: ["模板风险提示"],
    growth: ["模板成长建议"],
    careers: ["模板职业建议"],
    relationships: ["模板关系建议"]
  },
  isUnlocked: true,
  createdAt: new Date().toISOString()
};

export async function POST() {
  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const settings = await getAiSettings();
  const generation = await generatePersonalizedReportDetailed({
    settings,
    test: demoTest,
    answers: [
      {
        questionId: "demo-q1",
        values: ["emotion"]
      }
    ],
    result: demoResult
  });

  return NextResponse.json({
    ok: generation.status === "generated",
    status: generation.status,
    reason: generation.status === "generated" ? "" : generation.reason,
    provider: generation.provider,
    model: generation.model,
    attemptedAt: generation.attemptedAt
  });
}
