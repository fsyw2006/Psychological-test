"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ArticleEditorForm({ categoryId }: { categoryId?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        slug: formData.get("slug"),
        excerpt: formData.get("excerpt"),
        content: formData.get("content"),
        categoryId: categoryId || formData.get("categoryId"),
        tags: String(formData.get("tags") || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? "文章已发布" : data.error || "发布失败");
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">标题</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required />
      </div>
      {!categoryId ? (
        <div className="grid gap-2">
          <Label htmlFor="categoryId">分类 ID</Label>
          <Input id="categoryId" name="categoryId" required />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="tags">标签</Label>
        <Input id="tags" name="tags" placeholder="情绪,成长" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="excerpt">摘要</Label>
        <Textarea id="excerpt" name="excerpt" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content">正文</Label>
        <Textarea id="content" name="content" className="min-h-52" required />
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="animate-spin" /> : <Send />}
        发布文章
      </Button>
    </form>
  );
}
