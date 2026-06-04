"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Heart,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResultShareCard } from "@/components/reports/result-share-card";
import type { AssessmentResult } from "@/lib/types";

function ListBlock({
  title,
  items,
  icon: Icon
}: {
  title: string;
  items: string[];
  icon: typeof Sparkles;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/[0.56] p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ResultReport({
  resultId,
  initialResult
}: {
  resultId: string;
  initialResult?: AssessmentResult | null;
}) {
  const [result, setResult] = useState<AssessmentResult | null>(initialResult || null);
  const [loading, setLoading] = useState(!initialResult);
  const [regeneratingAi, setRegeneratingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  useEffect(() => {
    if (initialResult) return;
    let mounted = true;
    fetch(`/api/results/${resultId}`, {
      credentials: "include",
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("not found");
        return response.json();
      })
      .then((data) => {
        if (mounted) setResult(data.result);
      })
      .catch(() => {
        const cached = localStorage.getItem(`soul-house-result-${resultId}`);
        if (cached && mounted) setResult(JSON.parse(cached));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialResult, resultId]);

  async function regenerateAiReport() {
    setRegeneratingAi(true);
    setAiMessage("");

    const response = await fetch(`/api/results/${resultId}/regenerate-ai`, {
      method: "POST",
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setRegeneratingAi(false);
      setAiMessage(data.error || "AI 报告重新生成失败");
      return;
    }

    const refreshed = await fetch(`/api/results/${resultId}`, {
      credentials: "include",
      cache: "no-store"
    });
    const refreshedData = await refreshed.json().catch(() => ({}));
    if (refreshed.ok && refreshedData.result) {
      setResult(refreshedData.result);
    }

    setRegeneratingAi(false);
    setAiMessage(data.ok ? "AI 报告已重新生成" : data.reason || "AI 未成功，当前使用模板兜底");
  }

  if (loading) {
    return <div className="section-shell text-center text-muted-foreground">报告生成中...</div>;
  }

  if (!result) {
    return <div className="section-shell text-center text-muted-foreground">报告不存在或已失效。</div>;
  }

  const percent = Math.round((result.score / Math.max(1, result.maxScore)) * 100);
  const dimensions = Object.entries(result.dimensions || {}).sort((a, b) => b[1] - a[1]);
  const showDisclaimer =
    result.category.includes("情绪") ||
    ["phq-9", "gad-7", "stress-index", "sleep-quality", "social-anxiety"].includes(
      result.testSlug
    );
  const aiStatus = result.advancedAiStatus || result.advanced.aiStatus;
  const aiFailed = result.advancedSource !== "ai" && aiStatus?.status === "failed";
  const advancedBadgeText =
    result.advancedSource === "ai" ? "AI 个性化" : aiFailed ? "AI未成功" : "模板报告";

  return (
    <section className="section-shell">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="glass-panel rounded-lg p-4 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="soft">{result.category}</Badge>
              <h1 className="mt-3 text-2xl font-semibold sm:text-4xl">{result.testTitle}</h1>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{result.summary}</p>
            </div>
            <div className="rounded-lg bg-primary px-4 py-4 text-primary-foreground sm:px-5">
              <p className="text-sm opacity-85">结果类型</p>
              <p className="mt-1 text-2xl font-semibold">{result.type}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>基础分析</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>得分</span>
                  <span>
                    {result.score} / {result.maxScore}
                  </span>
                </div>
                <Progress value={percent} />
              </div>
              <div className="rounded-md bg-muted/70 p-4">
                <p className="text-sm text-muted-foreground">简要说明</p>
                <p className="mt-2 leading-7">{result.title}</p>
              </div>
              {dimensions.length ? (
                <div className="space-y-3">
                  {dimensions.map(([name, value]) => (
                    <div key={name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{name}</span>
                        <span>{value}</span>
                      </div>
                      <Progress value={(value / Math.max(...dimensions.map(([, v]) => v))) * 100} />
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>高级分析</CardTitle>
                <div className="flex flex-wrap justify-end gap-2">
                  {result.isUnlocked ? (
                    <Badge variant="soft">已解锁</Badge>
                  ) : (
                    <Badge variant="outline">会员解锁</Badge>
                  )}
                  <Badge variant={result.advancedSource === "ai" ? "soft" : "outline"}>
                    {advancedBadgeText}
                  </Badge>
                </div>
              </div>
              {result.isUnlocked && aiFailed ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {aiStatus?.reason || "AI 生成没有成功，当前展示模板兜底报告。"}
                </p>
              ) : null}
              {result.isUnlocked && result.advancedSource !== "ai" ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={regenerateAiReport}
                    disabled={regeneratingAi}
                    className="w-full sm:w-auto"
                  >
                    {regeneratingAi ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                    重新生成 AI 报告
                  </Button>
                  {aiMessage ? (
                    <p className="text-sm leading-6 text-muted-foreground">{aiMessage}</p>
                  ) : null}
                </div>
              ) : aiMessage ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{aiMessage}</p>
              ) : null}
            </CardHeader>
            <CardContent>
              {result.isUnlocked ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ListBlock title="性格特点" items={result.advanced.traits} icon={Sparkles} />
                  <ListBlock title="情绪风险提示" items={result.advanced.risks} icon={Lock} />
                  <ListBlock title="优势分析" items={result.advanced.strengths} icon={TrendingUp} />
                  <ListBlock title="潜在问题" items={result.advanced.risks} icon={Lock} />
                  <ListBlock title="成长建议" items={result.advanced.growth} icon={Sparkles} />
                  <ListBlock title="职业建议" items={result.advanced.careers} icon={BriefcaseBusiness} />
                  <ListBlock title="情感建议" items={result.advanced.relationships} icon={Heart} />
                  <ListBlock title="行动清单" items={result.advanced.growth} icon={CheckCircle2} />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.08] p-6 text-center">
                  <Lock className="mx-auto size-8 text-primary" />
                  <p className="mt-3 font-semibold">高级报告已生成</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    开通会员或单次解锁当前报告，查看性格特点、优势、潜在问题、成长、职业与情感建议。
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                    <Button asChild>
                      <Link href="/membership">开通会员</Link>
                    </Button>
                    <Button asChild variant="glass">
                      <Link href={`/checkout?plan=single-report&resultId=${result.id}`}>
                        立即解锁
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ResultShareCard result={result} />

        {showDisclaimer ? (
          <div className="rounded-lg border border-border bg-background/60 p-4 text-sm leading-7 text-muted-foreground">
            本测评结果仅用于自我了解与心理健康科普参考，不能替代专业医疗诊断。如你正在经历严重情绪困扰、自伤或伤害他人的想法，请立即联系当地急救电话、专业心理咨询机构或身边可信赖的人。
          </div>
        ) : null}
      </div>
    </section>
  );
}
