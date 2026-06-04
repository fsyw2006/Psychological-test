"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Assessment, AssessmentCategory, AssessmentQuestion } from "@/lib/types";

type TestDraft = {
  enabled: boolean;
  categorySlug: string;
  tags: string;
  estimatedMinutes: number;
  questionCount: number;
};

type NewTestDraft = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  categorySlug: string;
  estimatedMinutes: number;
  tags: string;
};

type RepairResponse = {
  error?: string;
  nextCursor?: number | null;
  repairedTests?: number;
  repairedQuestions?: number;
  repairedTemplates?: number;
};

function splitTags(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function TestManagementPanel({
  tests,
  categories
}: {
  tests: Assessment[];
  categories: AssessmentCategory[];
}) {
  const [categoryFilter, setCategoryFilter] = useState("all");
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
  const [newTest, setNewTest] = useState<NewTestDraft>({
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    categorySlug: categories[0]?.slug || "",
    estimatedMinutes: 5,
    tags: ""
  });
  const [questionDrafts, setQuestionDrafts] = useState<
    Record<string, AssessmentQuestion[]>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [message, setMessage] = useState("");

  const filteredTests = useMemo(
    () =>
      categoryFilter === "all"
        ? tests
        : tests.filter((test) => test.categorySlug === categoryFilter),
    [categoryFilter, tests]
  );

  function update(slug: string, patch: Partial<TestDraft>) {
    setDrafts((current) => ({
      ...current,
      [slug]: {
        ...current[slug],
        ...patch
      }
    }));
  }

  function updateNewTest(patch: Partial<NewTestDraft>) {
    setNewTest((current) => ({
      ...current,
      ...patch
    }));
  }

  async function createTest() {
    const title = newTest.title.trim();
    const description = newTest.description.trim();
    if (!title || !description || !newTest.categorySlug) {
      setMessage("请先填写测评标题、分类和说明。");
      return;
    }

    setCreating(true);
    setMessage("");

    const response = await fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        title,
        slug: newTest.slug || slugify(title),
        subtitle: newTest.subtitle || title,
        description,
        categorySlug: newTest.categorySlug,
        estimatedMinutes: Number(newTest.estimatedMinutes || 5),
        tags: splitTags(newTest.tags)
      })
    });
    const data = await response.json().catch(() => ({}));
    setCreating(false);

    if (!response.ok) {
      setMessage(data.error || "新增测评失败");
      return;
    }

    setNewTest({
      title: "",
      slug: "",
      subtitle: "",
      description: "",
      categorySlug: newTest.categorySlug,
      estimatedMinutes: 5,
      tags: ""
    });
    setMessage("测评已新增，并已同步创建默认报告模板。请刷新页面后继续编辑题库和模板。");
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
        tags: splitTags(draft.tags),
        estimatedMinutes: draft.estimatedMinutes
      })
    });
    const data = await response.json().catch(() => ({}));

    setSaving(null);
    setMessage(response.ok ? "测评配置已保存" : data.error || "保存失败");
  }

  async function repairBuiltInQuestionBank() {
    const confirmed = window.confirm(
      "确认恢复内置测评题库吗？系统会分批修复，避免触发 Cloudflare 子请求上限。"
    );
    if (!confirmed) return;

    setRepairing(true);
    setMessage("正在分批恢复内置题库...");

    let cursor: number | null = 0;
    let repairedTests = 0;
    let repairedQuestions = 0;
    let repairedTemplates = 0;

    for (let step = 0; cursor !== null && step < 20; step += 1) {
      const response: Response = await fetch("/api/admin/tests/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ cursor })
      });
      const data: RepairResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRepairing(false);
        setMessage(data.error || "内置题库恢复失败");
        return;
      }

      repairedTests += Number(data.repairedTests || 0);
      repairedQuestions += Number(data.repairedQuestions || 0);
      repairedTemplates += Number(data.repairedTemplates || 0);
      cursor = data.nextCursor ?? null;
      setMessage(
        `正在分批恢复：已修复 ${repairedTests} 个测评，${repairedQuestions} 道题。`
      );
    }

    setRepairing(false);
    setMessage(
      `内置题库已恢复：${repairedTests} 个测评，${repairedQuestions} 道题，${repairedTemplates} 个报告模板。请刷新页面查看最新数量。`
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
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="font-semibold">题库修复</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              如果前台分类显示 0 项，或某个测评没有题目，可先恢复内置测评题库。
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={repairBuiltInQuestionBank}
              disabled={repairing}
              className="mt-3 w-full sm:w-auto"
            >
              {repairing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              分批恢复内置题库
            </Button>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-test-title">新增测评标题</Label>
                <Input
                  id="new-test-title"
                  value={newTest.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    updateNewTest({
                      title,
                      slug: newTest.slug ? newTest.slug : slugify(title)
                    });
                  }}
                  placeholder="例如：边界感测评"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-test-slug">网址标识</Label>
                <Input
                  id="new-test-slug"
                  value={newTest.slug}
                  onChange={(event) => updateNewTest({ slug: slugify(event.target.value) })}
                  placeholder="boundary-sense"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="new-test-category">分类</Label>
                <Select
                  id="new-test-category"
                  value={newTest.categorySlug}
                  onChange={(event) => updateNewTest({ categorySlug: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-test-minutes">分钟</Label>
                <Input
                  id="new-test-minutes"
                  type="number"
                  min={1}
                  value={newTest.estimatedMinutes}
                  onChange={(event) =>
                    updateNewTest({ estimatedMinutes: Number(event.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-test-tags">标签</Label>
                <Input
                  id="new-test-tags"
                  value={newTest.tags}
                  onChange={(event) => updateNewTest({ tags: event.target.value })}
                  placeholder="自我觉察,成长"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-test-subtitle">副标题</Label>
                <Input
                  id="new-test-subtitle"
                  value={newTest.subtitle}
                  onChange={(event) => updateNewTest({ subtitle: event.target.value })}
                  placeholder="一句话说明测评用途"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-filter">按分类筛选</Label>
                <Select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">全部分类</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-test-description">测评说明</Label>
              <Textarea
                id="new-test-description"
                value={newTest.description}
                onChange={(event) => updateNewTest({ description: event.target.value })}
                className="min-h-24"
              />
            </div>
            <Button
              type="button"
              onClick={createTest}
              disabled={creating}
              className="w-full sm:w-fit"
            >
              {creating ? <Loader2 className="animate-spin" /> : <Plus />}
              添加测评并创建报告模板
            </Button>
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {filteredTests.map((test) => {
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
                <Select
                  id={`${test.slug}-category`}
                  value={draft.categorySlug}
                  onChange={(event) => update(test.slug, { categorySlug: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </Select>
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
                      className="w-full sm:w-auto"
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
                      className="w-full sm:w-auto"
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
