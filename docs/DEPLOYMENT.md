# 部署方案

## Cloudflare + Supabase

本项目使用 Cloudflare 官方推荐的 OpenNext Cloudflare 适配 Next.js API Routes，部署到 Workers Assets 并自动接入 Cloudflare CDN。若团队使用 Cloudflare Pages/Builds 的连接仓库体验，部署命令仍使用同一套 OpenNext 命令。

### 1. 环境变量

在 Cloudflare 项目或 Workers Builds 中配置 `.env.example` 中的变量：

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- 支付相关变量

### 2. 构建命令

```bash
npm install
npm run db:generate
npm run build:cloudflare
```

### 3. 部署命令

```bash
npm run deploy:cloudflare
```

`wrangler.jsonc` 已启用：

```json
{
  "main": ".open-next/worker.js",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

### 4. 数据库

首次上线前：

```bash
npm run db:push
npm run db:seed
```

并在 Supabase SQL Editor 执行 `supabase/rls.sql`。

## Docker 部署

```bash
cp .env.example .env
npm run docker:build
npm run docker:run
```

或：

```bash
docker compose up -d --build
```

Docker 使用 Next standalone 输出：

```bash
NEXT_OUTPUT=standalone npm run build
```

## 上线检查

- Supabase Auth Redirect URLs 已配置生产域名。
- RLS 已启用。
- 管理员邮箱写入 `ADMIN_EMAILS`。
- 支付回调地址为 HTTPS。
- `NEXT_PUBLIC_SITE_URL` 为最终域名。
- `/sitemap.xml` 与 `/robots.txt` 可访问。

## 官方参考

- Cloudflare Next.js/OpenNext: https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/
- Supabase Next.js SSR Auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- Next.js Metadata/Sitemap/Robots: https://nextjs.org/docs/app/api-reference/file-conventions/metadata
