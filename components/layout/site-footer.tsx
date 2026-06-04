import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/35 bg-background/70 dark:border-white/10">
      <div className="container grid gap-8 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              SH
            </span>
            <span className="font-semibold">心灵小屋 Soul House</span>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            专业心理测评与成长分析平台。测评结果用于自我理解与成长参考，不替代临床诊断或医疗建议。
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold">产品</p>
          <Link href="/tests" className="block text-muted-foreground hover:text-foreground">
            测评中心
          </Link>
          <Link
            href="/membership"
            className="block text-muted-foreground hover:text-foreground"
          >
            会员中心
          </Link>
          <Link
            href="/articles"
            className="block text-muted-foreground hover:text-foreground"
          >
            心理文章
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold">账户</p>
          <Link href="/account" className="block text-muted-foreground hover:text-foreground">
            用户中心
          </Link>
          <Link href="/auth/login" className="block text-muted-foreground hover:text-foreground">
            登录注册
          </Link>
          <Link href="/support" className="block text-muted-foreground hover:text-foreground">
            在线客服
          </Link>
        </div>
      </div>
    </footer>
  );
}
