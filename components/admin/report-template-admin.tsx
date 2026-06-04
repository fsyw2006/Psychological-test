"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ReportTemplate } from "@/lib/types";

type TemplateTest = {
  slug: string;
  title: string;
  category: string;
  reportTemplates: Record<string, ReportTemplate>;
};

export function ReportTemplateAdmin({ tests }: { tests: TemplateTest[] }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(
      tests.map((test) => [test.slug, JSON.stringify(test.reportTemplates, null, 2)])
    )
  );
  const [resultTypes, setResultTypes] = useState<Record<string, string>>(
    Object.fromEntries(
      tests.map((test) => [test.slug, Object.keys(test.reportTemplates)[0] || "默认"])
    )
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(tests.map((test) => test.category))).filter(Boolean),
    [tests]
  );
  const filteredTests = useMemo(
    () =>
      categoryFilter === "all"
        ? tests
        : tests.filter((test) => test.category === categoryFilter),
    [categoryFilter, tests]
  );

  function parseDraft(slug: string) {
    return JSON.parse(drafts[slug] || "{}") as Record<string, ReportTemplate>;
  }

  async function save(test: TemplateTest) {
    setSaving(test.slug);
    setMessage("");
    try {
      const parsed = parseDraft(test.slug);
      const response = await fetch("/api/admin/report-templates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          slug: test.slug,
          reportTemplates: parsed
        })
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? "报告模板已保存" : data.error || "保存失败");
    } catch {
      setMessage("JSON 格式不正确，请检查逗号和引号。");
    } finally {
      setSaving(null);
    }
  }

  async function generateTemplate(test: TemplateTest) {
    setGenerating(test.slug);
    setMessage("");

    try {
      const parsed = parseDraft(test.slug);
      const response = await fetch("/api/admin/report-templates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          slug: test.slug,
          resultType: resultTypes[test.slug] || Object.keys(parsed)[0] || "默认",
          reportTemplates: parsed
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || "AI 模板生成失败");
        return;
      }

      setDrafts((current) => ({
        ...current,
        [test.slug]: JSON.stringify(data.reportTemplates || parsed, null, 2)
      }));
      setMessage("AI 模板草稿已生成，请检查后点击保存模板。");
    } catch {
      setMessage("当前模板 JSON 格式不正确，修正后才能使用 AI 更新。");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background/55 p-4">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="report-category-filter">按分类筛选</Label>
          <Select
            id="report-category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">全部分类</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {filteredTests.map((test) => {
        const currentDraft = (() => {
          try {
            return parseDraft(test.slug);
          } catch {
            return test.reportTemplates;
          }
        })();
        const resultTypeOptions = Object.keys(currentDraft);

        return (
          <Card key={test.slug} className="glass-panel min-w-0 overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{test.title}</CardTitle>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  绑定结果类型：{resultTypeOptions.join(" / ") || "默认"}
                </p>
              </div>
              <Badge className="w-fit" variant="soft">
                {test.category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`${test.slug}-result-type`}>AI 更新结果类型</Label>
                  <Select
                    id={`${test.slug}-result-type`}
                    value={resultTypes[test.slug] || resultTypeOptions[0] || "默认"}
                    onChange={(event) =>
                      setResultTypes((current) => ({
                        ...current,
                        [test.slug]: event.target.value
                      }))
                    }
                  >
                    {resultTypeOptions.length ? (
                      resultTypeOptions.map((resultType) => (
                        <option key={resultType} value={resultType}>
                          {resultType}
                        </option>
                      ))
                    ) : (
                      <option value="默认">默认</option>
                    )}
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateTemplate(test)}
                  disabled={generating === test.slug}
                  className="w-full md:w-auto"
                >
                  {generating === test.slug ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  AI 更新模板
                </Button>
                <Button
                  type="button"
                  onClick={() => save(test)}
                  disabled={saving === test.slug}
                  className="w-full md:w-auto"
                >
                  {saving === test.slug ? <Loader2 className="animate-spin" /> : <Save />}
                  保存模板
                </Button>
              </div>

              <Textarea
                value={drafts[test.slug] || ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [test.slug]: event.target.value
                  }))
                }
                className="min-h-80 max-w-full font-mono text-xs leading-5"
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
