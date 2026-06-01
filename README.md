# 心灵小屋 Soul House

专业在线心理测评平台，支持心理测评、基础报告、高级报告解锁、会员订阅、单次购买、文章系统、用户中心、管理后台、微信支付与支付宝支付。

## 技术栈

- Next.js 15 / React 19 / TypeScript
- TailwindCSS / Shadcn UI 风格组件 / Framer Motion
- Next.js API Routes
- Supabase Auth + Supabase PostgreSQL
- Prisma Schema / Seed
- 微信支付 v3 Native / 支付宝 Page Pay
- Cloudflare Pages + OpenNext + Cloudflare CDN
- Docker standalone 部署

## 目录结构

```text
soul-house/
  app/
    api/                    # 测评、报告、订单、支付、后台 API Routes
    admin/                  # 管理后台
    account/                # 用户中心
    articles/               # 心理文章
    auth/                   # 登录注册与 Supabase 回调
    checkout/               # 收银台、成功、失败页
    membership/             # 会员中心
    reports/                # 测评结果页
    tests/                  # 测评中心与答题页
    sitemap.ts
    robots.ts
  components/
    admin/
    assessment/
    articles/
    auth/
    layout/
    payment/
    reports/
    sections/
    ui/
  lib/
    payments/               # 微信/支付宝/订单权益开通
    supabase/               # SSR/Auth 客户端
    auth.ts
    content.ts
    demo-data.ts
    scoring.ts
    security.ts
  prisma/
    schema.prisma
    seed.ts
  public/
    images/hero-soul-house.png
    icon.svg
  supabase/
    rls.sql
  docs/
    API.md
    DEPLOYMENT.md
    PAYMENTS.md
    SECURITY.md
    SUPABASE.md
```

## 快速开始

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

配置 Supabase 后执行：

```bash
npm run db:push
npm run db:seed
```

## 核心业务闭环

- 免费用户每日 1 次测评，可查看基础报告。
- 月会员 ¥19.9/月：无限测评、高级报告、历史记录、专属内容。
- 年会员 ¥168/年：无限测评、高级报告、心理成长档案、优先体验。
- 单次 ¥3.9 解锁当前报告，无需开通会员。
- 高级报告由数据库 `tests.report_templates` 预设模板生成，不调用 AI 接口。

## 部署

Cloudflare Pages 和 Docker 部署见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

Supabase 初始化见 [docs/SUPABASE.md](docs/SUPABASE.md)。

支付配置见 [docs/PAYMENTS.md](docs/PAYMENTS.md)。
