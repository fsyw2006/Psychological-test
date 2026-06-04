import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAiSettings, type AiSettings } from "@/lib/ai-settings";
import { callOpenAiCompatibleChat } from "@/lib/ai-openai-compatible";
import { requireAdminProfile } from "@/lib/auth";
import { sanitizeHtml, sanitizeText } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  topic: z.string().min(2).max(120),
  categoryName: z.string().max(60).optional().nullable(),
  tags: z.array(z.string().max(30)).default([])
});

type ArticleDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
};

function slugify(value: string) {
  const asciiSlug = value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return asciiSlug || `article-${Date.now()}`;
}

function normalizeTags(tags: string[], topic: string) {
  const next = tags
    .map((tag) => sanitizeText(tag, 16))
    .filter(Boolean)
    .slice(0, 6);

  if (next.length) return next;
  if (topic.includes("职场")) return ["职场成长", "自我觉察"];
  if (topic.includes("关系") || topic.includes("恋爱")) return ["人际关系", "情感关系"];
  if (topic.includes("情绪") || topic.includes("焦虑") || topic.includes("压力")) {
    return ["情绪管理", "压力调节"];
  }
  return ["自我提升", "心理科普"];
}

function buildMockDraft(topic: string, categoryName?: string | null, tags: string[] = []) {
  const safeTopic = sanitizeText(topic, 80);
  const safeCategory = sanitizeText(categoryName || "心理成长", 30);
  const nextTags = normalizeTags(tags, safeTopic);
  const title = safeTopic.includes("如何") ? safeTopic : `如何理解${safeTopic}`;
  const summaryTag = nextTags[0] || safeCategory;

  return {
    title,
    slug: slugify(title),
    excerpt: `${safeTopic}不是一个需要立刻被评价的问题，更适合被慢慢观察。本文会从自我觉察、日常信号和可执行行动三个角度，帮助你更温和地理解自己。`,
    content: [
      `很多人在面对“${safeTopic}”时，会先急着给自己下结论。但心理成长更像是整理一间房间：先看见现状，再决定从哪里开始调整。`,
      `从${safeCategory}的角度看，真正值得关注的不是某一次情绪或行为，而是它是否反复出现、是否影响了你的睡眠、关系、学习或工作节奏。`,
      `你可以先记录三个线索：事情发生在什么场景、当时身体有什么感受、你最想保护自己的哪一部分。这样的记录能帮助你把模糊的感受变得更具体。`,
      `如果你发现自己经常被同一种模式困住，不必急着责备自己。很多习惯都曾经在某个阶段保护过你，只是现在可能需要更新成更适合当下的方式。`,
      `一个轻量的行动建议是：每天给自己留出十分钟，写下今天最消耗你的事，以及一件你可以主动减少消耗的小动作。坚持一周后，你通常会更清楚自己的边界在哪里。`,
      `需要提醒的是，本文仅用于心理健康科普和自我了解。如果你正在经历严重情绪困扰、自伤或伤害他人的想法，请立即联系当地急救电话、专业机构或身边可信赖的人。`
    ].join("\n\n"),
    tags: Array.from(new Set([summaryTag, ...nextTags])).slice(0, 6)
  } satisfies ArticleDraft;
}

function safeDraft(input: Partial<ArticleDraft>, fallbackTopic: string): ArticleDraft {
  const fallback = buildMockDraft(fallbackTopic);
  const title = sanitizeText(input.title || fallback.title, 120);
  const content = sanitizeHtml(input.content || fallback.content);
  const tags = normalizeTags(input.tags || fallback.tags, title);

  return {
    title,
    slug: slugify(input.slug || title),
    excerpt: sanitizeText(input.excerpt || fallback.excerpt, 260),
    content,
    tags
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || "";
}

function articlePrompt(topic: string, categoryName: string | null | undefined, tags: string[]) {
  return [
    "你是心灵小屋后台文章助理，只能生成心理健康科普文章，不能生成医疗诊断、治疗方案或确诊语气。",
    "请返回严格 JSON，不要 Markdown 代码块。",
    "JSON 字段：title、slug、excerpt、content、tags。",
    "content 使用中文段落文本，段落之间用两个换行分隔，适合小红书引流的轻量心理成长文章。",
    "必须加入合规表达：仅用于自我了解和心理健康科普参考，不能替代专业医疗诊断。",
    `主题：${topic}`,
    `分类：${categoryName || "心理成长"}`,
    `标签：${tags.join("、") || "自我觉察、心理科普"}`
  ].join("\n");
}

async function callClaude(settings: AiSettings, prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.aiApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: settings.aiModel || "claude-3-5-sonnet-latest",
      max_tokens: 1800,
      system: settings.aiSystemPrompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Claude 服务请求失败");
  }

  return String(data.content?.[0]?.text || "");
}

export async function POST(request: NextRequest) {
  await requireAdminProfile();

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "文章生成参数错误" }, { status: 400 });
  }

  const settings = await getAiSettings();
  if (!settings.aiArticleEnabled) {
    return NextResponse.json(
      { error: "文章 AI 生成功能未开启，请先在后台 AI 功能设置中开启。" },
      { status: 403 }
    );
  }

  if (settings.aiProvider !== "mock" && !settings.aiApiKey) {
    return NextResponse.json({ error: "AI API Key 未配置" }, { status: 400 });
  }

  const { topic, categoryName, tags } = body.data;

  try {
    if (settings.aiProvider === "mock") {
      return NextResponse.json({
        draft: buildMockDraft(topic, categoryName, tags),
        provider: settings.aiProvider
      });
    }

    const prompt = articlePrompt(topic, categoryName, tags);
    const text =
      settings.aiProvider === "claude"
        ? await callClaude(settings, prompt)
        : await callOpenAiCompatibleChat({
            settings,
            messages: [
              {
                role: "system",
                content: settings.aiSystemPrompt
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7
          });
    const json = extractJson(text);
    const parsed = json ? JSON.parse(json) : { content: text };

    return NextResponse.json({
      draft: safeDraft(parsed, topic),
      provider: settings.aiProvider,
      model: settings.aiModel
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文章 AI 生成失败" },
      { status: 400 }
    );
  }
}
