"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FavoriteButton({ slug }: { slug: string }) {
  const [favorited, setFavorited] = useState(false);

  async function toggle() {
    const response = await fetch(`/api/articles/${slug}/favorite`, {
      method: "POST"
    });
    const data = await response.json();
    if (response.ok) setFavorited(Boolean(data.favorited));
  }

  return (
    <Button variant={favorited ? "default" : "glass"} size="sm" onClick={toggle}>
      <Bookmark />
      {favorited ? "已收藏" : "收藏"}
    </Button>
  );
}
