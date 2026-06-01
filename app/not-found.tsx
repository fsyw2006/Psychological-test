import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="section-shell">
      <div className="glass-panel mx-auto max-w-xl rounded-lg p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-3xl font-semibold">页面不存在</h1>
        <p className="mt-3 text-muted-foreground">你要找的内容可能已移动或暂时不可访问。</p>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </section>
  );
}
