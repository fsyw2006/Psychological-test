import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai-settings";
import { generatePersonalizedReportDetailed } from "@/lib/ai-report";
import { getAssessmentBySlug } from "@/lib/content";
import { hasServiceRoleEnv, hasSupabaseEnv } from "@/lib/env";
import { rateLimited } from "@/lib/security";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { scoreAssessment, validateAnswers } from "@/lib/scoring";
import { getPricingConfig } from "@/lib/pricing";
import type { AssessmentResult } from "@/lib/types";

const submitSchema = z.object({
  testSlug: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      values: z.array(z.string()).min(1)
    })
  )
});

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function POST(request: NextRequest) {
  const limited = rateLimited(request, "submit-result");
  if (limited) return limited;

  const body = submitSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "提交内容不完整" }, { status: 400 });
  }

  const test = await getAssessmentBySlug(body.data.testSlug);
  if (!test) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }

  const validation = validateAnswers(test, body.data.answers);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const profile = await getCurrentProfile();
  if (hasSupabaseEnv() && !profile) {
    return NextResponse.json({ error: "请先登录后再提交测评" }, { status: 401 });
  }

  if (!hasServiceRoleEnv() || !profile) {
    const result = scoreAssessment(test, body.data.answers, false);
    return NextResponse.json({ result });
  }

  const supabase = createSupabaseServiceClient();
  const pricing = await getPricingConfig();
  const { data: userRow } = await supabase
    .from("users")
    .select("daily_test_count,daily_reset_at")
    .eq("id", profile.id)
    .single();

  const now = new Date();
  const usageDate = now.toISOString().slice(0, 10);
  const { data: membership } = await supabase
    .from("memberships")
    .select("id,plan,ends_at")
    .eq("user_id", profile.id)
    .eq("status", "ACTIVE")
    .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
    .order("ends_at", { ascending: false, nullsFirst: true })
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasMembership = Boolean(membership);
  const resetAt = userRow?.daily_reset_at ? new Date(userRow.daily_reset_at) : now;
  let dailyCount = sameDay(resetAt, now) ? Number(userRow?.daily_test_count || 0) : 0;

  const { data: usageLimit } = await supabase
    .from("usage_limits")
    .select("test_count")
    .eq("user_id", profile.id)
    .eq("date", usageDate)
    .maybeSingle();

  if (usageLimit) {
    dailyCount = Number(usageLimit.test_count || 0);
  }

  if (!hasMembership && dailyCount >= pricing.dailyFreeTests) {
    return NextResponse.json(
      {
        error: `免费版每日可完成 ${pricing.dailyFreeTests} 次测评，可开通会员解锁无限测评。`
      },
      { status: 402 }
    );
  }

  const result = scoreAssessment(test, body.data.answers, hasMembership);
  const advanced = {
    ...result.advanced,
    source: "template" as const,
    generatedByAi: false
  };
  let finalResult: AssessmentResult = {
    ...result,
    advanced,
    advancedSource: "template"
  };

  if (hasMembership) {
    try {
      const settings = await getAiSettings();
      const aiGeneration = await generatePersonalizedReportDetailed({
        settings,
        test,
        answers: body.data.answers,
        result
      });

      const aiStatus = {
        status: aiGeneration.status,
        reason: aiGeneration.status === "generated" ? undefined : aiGeneration.reason,
        provider: aiGeneration.provider,
        model: aiGeneration.model,
        attemptedAt: aiGeneration.attemptedAt
      };

      if (aiGeneration.status === "generated") {
        const aiAdvanced = {
          ...aiGeneration.report,
          aiStatus
        };
        finalResult = {
          ...result,
          title: aiAdvanced.title,
          summary: aiAdvanced.summary,
          advanced: aiAdvanced,
          advancedSource: "ai"
        };
      } else {
        finalResult = {
          ...finalResult,
          advanced: {
            ...finalResult.advanced,
            aiStatus
          }
        };
      }
    } catch (error) {
      console.error("Failed to generate personalized AI report.", error);
    }
  }

  const { data: testRow, error: testError } = await supabase
    .from("tests")
    .select("id,completion_count")
    .eq("slug", test.slug)
    .single();

  if (testError || !testRow) {
    return NextResponse.json({ error: "测评配置未初始化" }, { status: 500 });
  }

  const { data: savedResult, error: resultError } = await supabase
    .from("results")
    .insert({
      user_id: profile.id,
      test_id: testRow.id,
      score: finalResult.score,
      max_score: finalResult.maxScore,
      type: finalResult.type,
      summary: finalResult.summary,
      dimensions: finalResult.dimensions,
      advanced_report: finalResult.advanced,
      is_unlocked: hasMembership,
      access_type: hasMembership ? "MEMBERSHIP" : "FREE"
    })
    .select("id, created_at")
    .single();

  if (resultError || !savedResult) {
    return NextResponse.json({ error: "报告保存失败" }, { status: 500 });
  }

  await supabase.from("answers").insert(
    body.data.answers.map((answer) => ({
      user_id: profile.id,
      result_id: savedResult.id,
      question_id: answer.questionId,
      values: answer.values,
      score: 0
    }))
  );

  await supabase
    .from("tests")
    .update({
      completion_count:
        Number((testRow as { completion_count?: number }).completion_count || 0) + 1
    })
    .eq("id", testRow.id);

  await supabase
    .from("users")
    .update({
      daily_test_count: hasMembership ? dailyCount : dailyCount + 1,
      daily_reset_at: now.toISOString()
    })
    .eq("id", profile.id);

  if (!hasMembership) {
    await supabase.from("usage_limits").upsert(
      {
        user_id: profile.id,
        date: usageDate,
        test_count: dailyCount + 1
      },
      {
        onConflict: "user_id,date"
      }
    );
  }

  return NextResponse.json({
    result: {
      ...finalResult,
      id: savedResult.id,
      isUnlocked: hasMembership,
      createdAt: savedResult.created_at
    }
  });
}
