"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ArticleCategory = {
  id: string;
  name: string;
};

type ArticleDraft = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  tags: string[];
};

function splitTags(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ArticleEditorForm({ categories = [] }: { categories?: ArticleCategory[] }) {
  const defaultCategoryId = categories[0]?.id || "";
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryValue, setCategoryValue] = useState(defaultCategoryId);
  const [aiTopic, setAiTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [aiMessage, setAiMessage] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryValue) || categories[0],
    [categories, categoryValue]
  );

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
        categoryName: selectedCategory?.name,
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
    setExcerpt(draft.excerpt || "");
    setContent(draft.content || "");
    setTags((draft.tags || []).join("，"));
    setAiMessage("AI 草稿已生成，请检查后再发布。");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!categoryValue) {
      setMessage("请先选择文章分类。");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        title,
        excerpt,
        content,
        categoryId: categoryValue,
        tags: splitTags(tags)
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(response.ok ? "文章已发布，前台文章列表会同步更新。" : data.error || "发布失败");
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
          <Label htmlFor="categoryId">分类</Label>
          <Select
            id="categoryId"
            name="categoryId"
            value={categoryValue}
            onChange={(event) => setCategoryValue(event.target.value)}
            disabled={!categories.length}
            required
          >
            {categories.length ? (
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            ) : (
              <option value="">未找到文章分类</option>
            )}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tags">标签</Label>
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="情绪管理，成长"
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
        <Button disabled={loading || !categories.length} className="w-full sm:w-auto">
          {loading ? <Loader2 className="animate-spin" /> : <Send />}
          发布文章
        </Button>
      </form>
    </div>
  );
}
