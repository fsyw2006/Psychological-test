import { nanoid } from "nanoid";
import type {
  Assessment,
  AssessmentAnswerDetail,
  AssessmentAnswerInput,
  AssessmentOption,
  AssessmentResult,
  ReportTemplate
} from "@/lib/types";

function optionByValue(options: AssessmentOption[], value: string) {
  return options.find((option) => option.value === value);
}

function topDimension(dimensions: Record<string, number>, fallback = "默认") {
  const entries = Object.entries(dimensions).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || fallback;
}

function sumSeverity(slug: string, score: number) {
  if (slug === "phq-9") {
    if (score <= 4) return "低";
    if (score <= 14) return "中";
    return "高";
  }
  if (slug === "gad-7") {
    if (score <= 4) return "低";
    if (score <= 14) return "中";
    return "高";
  }
  if (score <= 10) return "低";
  if (score <= 20) return "中";
  return "高";
}

function templateFor(test: Assessment, type: string): ReportTemplate {
  return (
    test.reportTemplates[type] ||
    test.reportTemplates["默认"] ||
    Object.values(test.reportTemplates)[0]
  );
}

export function buildAnswerDetails(
  test: Assessment,
  answers: AssessmentAnswerInput[]
): AssessmentAnswerDetail[] {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.values]));

  return test.questions
    .map((question, index) => {
      const selectedValues = answerMap.get(question.id) || [];
      const selectedLabels = selectedValues.map(
        (value) => optionByValue(question.options, value)?.label || value
      );

      return {
        questionId: question.id,
        questionOrder: index + 1,
        questionTitle: question.title,
        selectedValues,
        selectedLabels
      };
    })
    .filter((item) => item.selectedValues.length > 0);
}

export function scoreAssessment(
  test: Assessment,
  answers: AssessmentAnswerInput[],
  unlocked = false
): AssessmentResult {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.values]));
  const dimensions: Record<string, number> = {};
  let score = 0;
  let maxScore = test.scoring.maxScore || test.questions.length;

  for (const question of test.questions) {
    const values = answerMap.get(question.id) || [];
    for (const value of values) {
      const option = optionByValue(question.options, value);
      if (!option) continue;
      const point = option.score ?? 1;
      score += point;
      const dimension = option.dimension || question.dimension;
      if (dimension) {
        dimensions[dimension] = (dimensions[dimension] || 0) + point;
      }
    }
    if (question.type === "likert") {
      const highest = Math.max(...question.options.map((option) => option.score ?? 0));
      maxScore += test.scoring.kind === "sum" ? 0 : highest;
    }
  }

  if (test.scoring.kind === "sum") {
    maxScore = test.scoring.maxScore || maxScore;
  } else if (test.scoring.kind === "mbti") {
    maxScore = test.questions.length;
  } else {
    maxScore = Math.max(test.questions.length, score);
  }

  let type = "默认";

  if (test.scoring.kind === "sum") {
    type = sumSeverity(test.slug, score);
  }

  if (test.scoring.kind === "mbti") {
    const pair = (a: string, b: string) => ((dimensions[a] || 0) >= (dimensions[b] || 0) ? a : b);
    type = `${pair("E", "I")}${pair("S", "N")}${pair("T", "F")}${pair("J", "P")}`;
  }

  if (
    test.scoring.kind === "dimension" ||
    test.scoring.kind === "disc" ||
    test.scoring.kind === "holland" ||
    test.scoring.kind === "attachment"
  ) {
    type = topDimension(dimensions);
  }

  if (test.scoring.kind === "enneagram") {
    type = `九型 ${topDimension(dimensions)}`;
  }

  const advanced = templateFor(test, type);

  return {
    id: `result_${nanoid(12)}`,
    testSlug: test.slug,
    testTitle: test.title,
    category: test.category,
    score,
    maxScore,
    type,
    title: advanced.title,
    summary: advanced.summary,
    dimensions,
    advanced,
    answerDetails: buildAnswerDetails(test, answers),
    isUnlocked: unlocked,
    createdAt: new Date().toISOString()
  };
}

export function validateAnswers(test: Assessment, answers: AssessmentAnswerInput[]) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.values]));
  const missing = test.questions.filter((question) => {
    if (!question.required) return false;
    const values = answerMap.get(question.id) || [];
    return values.length === 0;
  });

  if (missing.length > 0) {
    return {
      ok: false,
      message: `还有 ${missing.length} 道必答题未完成`
    };
  }

  for (const question of test.questions) {
    const values = answerMap.get(question.id) || [];
    if (question.max && values.length > question.max) {
      return {
        ok: false,
        message: `${question.title} 最多选择 ${question.max} 项`
      };
    }
  }

  return { ok: true, message: "" };
}
