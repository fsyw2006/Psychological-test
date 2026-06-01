"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ReportTemplate } from "@/lib/types";

type TemplateTest = {
  slug: string;
  title: string;
  category: string;
  reportTemplates: Record<string, ReportTemplate>;
};

export function ReportTemplateAdmin({ tests }: { tests: TemplateTest[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(
      tests.map((test) => [test.slug, JSON.stringify(test.reportTemplates, null, 2)])
    )
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function save(test: TemplateTest) {
    setSaving(test.slug);
    setMessage("");
    try {
      const parsed = JSON.parse(drafts[test.slug] || "{}");
      const response = await fetch("/api/admin/report-templates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          slug: test.slug,
          reportTemplates: parsed
        })
      });
      const data = await response.json();
      setMessage(response.ok ? "报告模板已保存" : data.error || "保存失败");
    } catch {
      setMessage("JSON 格式不正确，请检查逗号和引号。");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      ) : null}

      {tests.map((test) => (
        <Card key={test.slug} className="glass-panel min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle>{test.title}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                绑定结果类型：{Object.keys(test.reportTemplates).join(" / ")}
              </p>
            </div>
            <Badge className="w-fit" variant="soft">
              {test.category}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={drafts[test.slug] || ""}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [test.slug]: event.target.value
                }))
              }
              className="min-h-80 font-mono text-xs leading-5"
            />
            <Button
              type="button"
              onClick={() => save(test)}
              disabled={saving === test.slug}
              className="w-full sm:w-auto"
            >
              {saving === test.slug ? <Loader2 className="animate-spin" /> : <Save />}
              保存模板
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
