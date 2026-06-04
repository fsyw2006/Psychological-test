"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Assessment, AssessmentCategory, AssessmentQuestion } from "@/lib/types";

type TestDraft = {
  enabled: boolean;
  categorySlug: string;
  tags: string;
  estimatedMinutes: number;
  questionCount: number;
};

export function TestManagementPanel({
  tests,
  categories
}: {
  tests: Assessment[];
  categories: AssessmentCategory[];
}) {
  const [drafts, setDrafts] = useState<Record<string, TestDraft>>(
    Object.fromEntries(
      tests.map((test) => [
        test.slug,
        {
          enabled: true,
          categorySlug: test.categorySlug,
          tags: test.tags.join(", "),
          estimatedMinutes: test.estimatedMinutes,
          questionCount: test.questions.length
        }
      ])
    )
  );
  const [questionDrafts, setQuestionDrafts] = useState<
    Record<string, AssessmentQuestion[]>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [message, setMessage] = useState("");

  function update(slug: string, patch: Partial<TestDraft>) {
    setDrafts((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        ...patch
      }
    }));
  }

  async function save(test: Assessment) {
    const draft = drafts[test.slug];
    setSaving(test.slug);
    setMessage("");

    const response = await fetch("/api/admin/tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        slug: test.slug,
        enabled: draft.enabled,
        categorySlug: draft.categorySlug,
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        estimatedMinutes: draft.estimatedMinutes
      })
    });
    const data = await response.json().catch(() => ({}));

    setSaving(null);
    setMessage(response.ok ? "测评配置已保存" : data.error || "保存失败");
  }

  async function repairBuiltInQuestionBank() {
    const confirmed = window.confirm(
      "确认恢复内置测评题库吗？这会把内置测评的分类、题目和报告模板修复到 Supabase，用于解决分类 0 项或题目为空的问题。"
    );
    if (!confirmed) return;

    setRepairing(true);
    setMessage("");

    const response = await fetch("/api/admin/tests/repair", {
      method: "POST",
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    setRepairing(false);

    if (!response.ok) {
      setMessage(data.error || "内置题库恢复失败");
      return;
    }

    setMessage(
      `内置题库已恢复：${data.repairedTests || 0} 个测评，${data.repairedQuestions || 0} 道题。请刷新页面查看最新数量。`
    );
  }

  async function generateQuestions(test: Assessment) {
    const draft = drafts[test.slug];
    setGenerating(test.slug);
    setMessage("");

    const response = await fetch("/api/admin/tests/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        slug: test.slug,
        questionCount: Math.max(3, Number(draft.questionCount || test.questions.length || 8))
      })
    });
    const data = await response.json().catch(() => ({}));
    setGenerating(null);

    if (!response.ok) {
      setMessage(data.error || "AI 题目生成失败");
      return;
    }

    setQuestionDrafts((current) => ({
      ...current,
      [test.slug]: data.questions || []
    }));
    setMessage("AI 题目草稿已生成，请先检查，再保存为正式题目。");
  }

  async function applyQuestions(test: Assessment) {
    const questions = questionDrafts[test.slug] || [];
    if (!questions.length) return;

    const confirmed = window.confirm(
      `确认把 ${test.title} 的正式题库替换为这 ${questions.length} 道 AI 草稿题吗？`
    );
    if (!confirmed) return;

    setApplying(test.slug);
    setMessage("");

    const response = await fetch("/api/admin/tests/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        slug: test.slug,
        questions
      })
    });
    const data = await response.json().catch(() => ({}));
    setApplying(null);

    if (!response.ok) {
      setMessage(data.error || "正式题目保存失败");
      return;
    }

    update(test.slug, { questionCount: data.questionCount || questions.length });
    setMessage("AI 题目已保存为正式题库，前台测评会同步使用。");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background/55 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">题库修复</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              如果前台分类显示 0 项，或某个测评没有题目，可先恢复内置测评题库。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={repairBuiltInQuestionBank}
            disabled={repairing}
          >
            {repairing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            一键恢复内置题库
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {tests.map((test) => {
        const draft = drafts[test.slug];
        const generatedQuestions = questionDrafts[test.slug] || [];

        return (
          <Card key={test.slug} className="glass-panel overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{test.title}</CardTitle>
                <p className="mt-2 break-all text-sm text-muted-foreground">{test.slug}</p>
              </div>
              <Badge className="w-fit" variant={draft.enabled ? "soft" : "outline"}>
                {draft.enabled ? "已启用" : "已禁用"}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[120px_1fr_160px_120px_auto] lg:items-end">
              <div className="flex h-11 items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 text-sm font-medium lg:justify-center">
                启用
                <Switch
                  checked={draft.enabled}
                  onChange={(event) => update(test.slug, { enabled: event.target.checked })}
                  aria-label={`启用 ${test.title}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${test.slug}-category`}>分类</Label>
                <select
                  id={`${test.slug}-category`}
                  value={draft.categorySlug}
                  onChange={(event) => update(test.slug, { categorySlug: event.target.value })}
                  className="focus-ring h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${test.slug}-minutes`}>预计时间</Label>
                <Input
                  id={`${test.slug}-minutes`}
                  type="number"
                  min={1}
                  value={draft.estimatedMinutes}
                  onChange={(event) =>
                    update(test.slug, { estimatedMinutes: Number(event.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${test.slug}-count`}>题目数量</Label>
                <Input
                  id={`${test.slug}-count`}
                  type="number"
                  min={3}
                  value={draft.questionCount}
                  onChange={(event) =>
                    update(test.slug, { questionCount: Number(event.target.value) })
                  }
                />
              </div>

              <Button onClick={() => save(test)} disabled={saving === test.slug}>
                {saving === test.slug ? <Loader2 className="animate-spin" /> : <Save />}
                保存
              </Button>

              <div className="space-y-2 lg:col-span-5">
                <Label htmlFor={`${test.slug}-tags`}>标签</Label>
                <Input
                  id={`${test.slug}-tags`}
                  value={draft.tags}
                  onChange={(event) => update(test.slug, { tags: event.target.value })}
                />
              </div>

              <div className="rounded-lg border border-border bg-background/55 p-4 lg:col-span-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold">AI 题库辅助</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      AI 只生成草稿。保存前请检查题意、选项、分值和维度。
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateQuestions(test)}
                      disabled={generating === test.slug}
                    >
                      {generating === test.slug ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Sparkles />
                      )}
                      AI 生成题目草稿
                    </Button>
                    <Button
                      type="button"
                      onClick={() => applyQuestions(test)}
                      disabled={!generatedQuestions.length || applying === test.slug}
                    >
                      {applying === test.slug ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <CheckCircle2 />
                      )}
                      保存为正式题目
                    </Button>
                  </div>
                </div>

                {generatedQuestions.length ? (
                  <div className="mt-4 grid gap-3">
                    {generatedQuestions.map((question, index) => (
                      <div
                        key={`${question.id}-${index}`}
                        className="rounded-md border border-border bg-background/70 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            {index + 1}. {question.title}
                          </p>
                          <Badge variant="outline">{question.type}</Badge>
                        </div>
                        {question.helper ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {question.helper}
                          </p>
                        ) : null}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option) => (
                            <div
                              key={`${option.value}-${option.label}`}
                              className="rounded-md bg-muted/60 px-3 py-2 text-sm"
                            >
                              <span>{option.label}</span>
                              <span className="ml-2 text-muted-foreground">
                                {option.dimension ? `${option.dimension} / ` : ""}
                                {typeof option.score === "number"
                                  ? `${option.score} 分`
                                  : "无分值"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
