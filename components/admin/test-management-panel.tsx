"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Assessment, AssessmentCategory } from "@/lib/types";

export function TestManagementPanel({
  tests,
  categories
}: {
  tests: Assessment[];
  categories: AssessmentCategory[];
}) {
  const [drafts, setDrafts] = useState(
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
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function update(slug: string, patch: Record<string, unknown>) {
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
    const data = await response.json();
    setSaving(null);
    setMessage(response.ok ? "测评配置已保存" : data.error || "保存失败");
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {tests.map((test) => {
        const draft = drafts[test.slug];
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
              <label className="flex h-11 items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 text-sm font-medium lg:justify-center">
                启用
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) => update(test.slug, { enabled: event.target.checked })}
                  className="size-4 accent-primary"
                />
              </label>
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
                <Input id={`${test.slug}-count`} value={draft.questionCount} disabled />
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
