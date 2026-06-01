"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentResult } from "@/lib/types";

function shareText(result: AssessmentResult) {
  if (result.category.includes("情感")) {
    return `刚测了一下「${result.testTitle}」，原来我的恋爱/关系模式是「${result.type}」。有些描述真的戳中我了，准备认真看看自己的相处方式。`;
  }
  if (result.category.includes("职业")) {
    return `这个职业兴趣测试让我重新理解了自己适合什么方向。我的结果是「${result.type}」，感觉可以作为下一步规划的参考。`;
  }
  if (result.category.includes("社交")) {
    return `测完「${result.testTitle}」才发现，我在人际互动里的关键词是「${result.type}」。有点准，也有点提醒我。`;
  }
  return `刚测了一下我的人格/状态类型，结果是「${result.type}」，真的有点准。了解自己，可能就是改变自己的开始。`;
}

function keywords(result: AssessmentResult) {
  const dimensions = Object.keys(result.dimensions || {}).slice(0, 3);
  return dimensions.length ? dimensions : [result.category, result.type, "自我了解"];
}

export function ResultShareCard({ result }: { result: AssessmentResult }) {
  const [message, setMessage] = useState("");
  const copy = useMemo(() => shareText(result), [result]);
  const tags = useMemo(() => keywords(result), [result]);

  async function copyText() {
    await navigator.clipboard.writeText(copy);
    setMessage("分享文案已复制");
  }

  async function saveCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
    gradient.addColorStop(0, "#fff8ec");
    gradient.addColorStop(0.55, "#f4ead9");
    gradient.addColorStop(1, "#dfeee6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 1200);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.roundRect(70, 80, 760, 1040, 42);
    ctx.fill();

    ctx.fillStyle = "#31443a";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("心灵小屋 Soul House", 120, 155);

    ctx.font = "bold 54px sans-serif";
    ctx.fillText(result.testTitle, 120, 285);

    ctx.font = "bold 86px sans-serif";
    ctx.fillText(result.type, 120, 420);

    ctx.font = "30px sans-serif";
    ctx.fillStyle = "#65756d";
    const summary = result.summary.slice(0, 46);
    ctx.fillText(summary, 120, 500);

    tags.forEach((tag, index) => {
      const x = 120 + index * 210;
      ctx.fillStyle = "rgba(107,132,114,0.16)";
      ctx.roundRect(x, 575, 170, 54, 27);
      ctx.fill();
      ctx.fillStyle = "#3f5b4d";
      ctx.font = "24px sans-serif";
      ctx.fillText(`#${tag}`, x + 20, 610);
    });

    ctx.fillStyle = "#31443a";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("了解自己，是改变自己的开始", 120, 770);

    ctx.strokeStyle = "#95aa9e";
    ctx.lineWidth = 4;
    ctx.strokeRect(610, 880, 130, 130);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#65756d";
    ctx.fillText("二维码占位", 628, 950);
    ctx.fillText("soul-house", 120, 1010);

    const link = document.createElement("a");
    link.download = `${result.testSlug}-${result.type}-soul-house.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setMessage("结果卡片已生成");
  }

  async function shareXhs() {
    await copyText();
    window.open("https://www.xiaohongshu.com", "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>复制我的小红书分享文案</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-background/60 p-4 text-sm leading-7 text-muted-foreground">
          {copy}
        </div>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" onClick={copyText}>
            <Copy />
            复制文案
          </Button>
          <Button type="button" variant="glass" onClick={saveCard}>
            <Download />
            保存结果卡片
          </Button>
          <Button type="button" onClick={shareXhs}>
            <Share2 />
            分享到小红书
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
