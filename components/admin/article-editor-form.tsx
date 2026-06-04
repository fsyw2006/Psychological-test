"use client";

import { useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ArticleDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
};

function splitTags(value: string) {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ArticleEditorForm({
  categoryId,
  categoryName
}: {
  categoryId?: string;
  categoryName?: string;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryValue, setCategoryValue] = useState(categoryId || "");
  const [aiTopic, setAiTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [aiMessage, setAiMessage] = useState("");

  async function generateDraft() {
    const topic = (aiTopic || title).trim();
    if (!topic) {
      setAiMessage("请先填写一个文章主题。");
      return;
    }

    setGenerating(true);
    setAiMessage("");

    const response = await fetch("/api/admin/articles/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        topic,
        categoryName,
        tags: splitTags(tags)
      })
    });
    const data = await response.json().catch(() => ({}));
    setGenerating(false);

    if (!response.ok) {
      setAiMessage(data.error || "AI 生成失败");
      return;
    }

    const draft = data.draft as ArticleDraft;
    setTitle(draft.title || "");
    setSlug(draft.slug || "");
    setExcerpt(draft.excerpt || "");
    setContent(draft.content || "");
    setTags((draft.tags || []).join(","));
    setAiMessage("AI 草稿已生成，请检查后再发布。");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        title,
        slug,
        excerpt,
        content,
        categoryId: categoryId || categoryValue,
        tags: splitTags(tags)
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(response.ok ? "文章已发布" : data.error || "发布失败");
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-background/60 p-4">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Bot className="size-5 text-primary" />
          AI 生成文章草稿
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="ai-topic">文章主题</Label>
            <Input
              id="ai-topic"
              value={aiTopic}
              onChange={(event) => setAiTopic(event.target.value)}
              placeholder="例如：如何缓解职场焦虑"
            />
          </div>
          <Button
            type="button"
            onClick={generateDraft}
            disabled={generating}
            className="mt-auto w-full sm:w-auto"
          >
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            AI 生成草稿
          </Button>
        </div>
        {aiMessage ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{aiMessage}</p>
        ) : null}
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
        </div>
        {!categoryId ? (
          <div className="grid gap-2">
            <Label htmlFor="categoryId">分类 ID</Label>
            <Input
              id="categoryId"
              name="categoryId"
              value={categoryValue}
              onChange={(event) => setCategoryValue(event.target.value)}
              required
            />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="tags">标签</Label>
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="情绪,成长"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="excerpt">摘要</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="content">正文</Label>
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-52"
            required
          />
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="animate-spin" /> : <Send />}
          发布文章
        </Button>
      </form>
    </div>
  );
}
