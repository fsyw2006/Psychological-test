# 心灵小屋上线部署文档

本文件只说明部署，不重写业务功能、不重做 UI、不接真实微信/支付宝。当前支付使用 Mock 支付，AI 聊天默认关闭。

## 0. 本地检查

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run build:cloudflare
```

当前项目已验证：

- `npm install` 正常。
- `npm run typecheck` 通过。
- `npm run lint` 通过。
- `npm run build` 通过。
- `npm run build:cloudflare` 通过。

说明：项目包含 Next.js API Routes，属于 SSR/动态站点，不是纯静态导出。Cloudflare Pages 上线建议使用 OpenNext 输出。

## 1. Supabase 创建项目

1. 登录 Supabase。
2. 创建项目，记录 Project Ref。
3. 进入 `Project Settings -> API`，复制：
   - `Project URL`
   - `anon public key`
   - `service_role key`
4. 进入 `Project Settings -> Database -> Connection string -> URI`，复制数据库连接串。

不要把数据库密码、`SUPABASE_SERVICE_ROLE_KEY`、`DATABASE_URL` 提交到 GitHub。

## 2. 导入数据库 SQL

当前 Codex 已经通过 Supabase 授权工具为项目 `wrtgytkjnfvmmmkeltob` 创建了表结构与 RLS。后续如果你重建 Supabase 项目，仍可使用下面的 SQL/CLI 方式一键初始化。

最简单方式：打开 Supabase SQL Editor，复制并执行：

```text
supabase/COPY_TO_SUPABASE.sql
```

这个文件包含：

- 数据库表结构
- 测评数据
- 报告模板
- 套餐配置
- AI 默认关闭配置
- RLS 权限策略

说明：线上首次构建或首次访问动态页面时，应用会自动把 `lib/demo-data.ts` 中的 15 个测评、题目、报告模板、会员套餐和默认配置导入数据库。如果你希望手动导入完整数据，也可以执行上面的 `COPY_TO_SUPABASE.sql`。

也可以使用 Supabase CLI：

```bash
supabase login
supabase link --project-ref wrtgytkjnfvmmmkeltob
supabase db push
```

CLI 会按顺序执行：

```text
supabase/migrations/202606010000_init.sql
supabase/migrations/202606010001_feature_completion.sql
supabase/migrations/202606010002_seed_and_rls.sql
```

注意：SQL Editor 方式和 `supabase db push` 方式二选一即可，不要在同一个空库里重复执行两套初始化。

## 3. 配置 Supabase Auth

进入 `Authentication -> URL Configuration`：

Site URL：

```text
https://你的项目.pages.dev
```

Redirect URLs：

```text
http://127.0.0.1:3000/auth/callback
https://你的项目.pages.dev/auth/callback
https://你的自定义域名/auth/callback
```

前期可以使用邮箱密码登录。正式上线建议开启邮箱验证。

## 4. 部署 Supabase Edge Functions

已提供 Mock 支付 Edge Function：

```text
supabase/functions/mock-payment/index.ts
supabase/functions/_shared/cors.ts
supabase/config.toml
```

部署命令：

```bash
supabase login
supabase link --project-ref wrtgytkjnfvmmmkeltob
supabase functions deploy mock-payment --project-ref wrtgytkjnfvmmmkeltob
```

当前前端支付闭环主要使用 Next.js API：

```text
/api/payments/wechat/create
/api/payments/alipay/create
/api/payments/mock/confirm
```

真实微信/支付宝暂不启用，后续可在后台和环境变量中扩展。

## 5. 上传代码到 GitHub

如果本机已经安装 Git：

```bash
git init
git add .
git commit -m "Deploy Soul House"
git branch -M main
git remote add origin https://github.com/fsyw2006/Psychological-test.git
git push -u origin main
```

如果仓库已有历史：

```bash
git remote add origin https://github.com/fsyw2006/Psychological-test.git
git pull origin main --allow-unrelated-histories
git add .
git commit -m "Deploy Soul House"
git push -u origin main
```

确认不要上传：

```text
.env
.env.local
node_modules
.next
.open-next
```

## 6. Cloudflare Pages 连接 GitHub

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 创建 Pages 项目。
4. 连接 GitHub 仓库 `fsyw2006/Psychological-test`。
5. 选择生产分支 `main`。

因为本项目是 Next.js SSR/API 项目，Cloudflare Pages 推荐配置：

```text
Build command: npm run build:cloudflare
Build output directory: .open-next/assets
Node version: 20
```

项目文件已提供：

```text
wrangler.toml
open-next.config.ts
```

`npm run build` 仍保留为标准 Next.js 构建检查，会输出 `.next`；真正 Cloudflare SSR 上线使用 `npm run build:cloudflare`。

## 7. Cloudflare Pages 环境变量

在 Cloudflare Pages 项目 `Settings -> Environment variables` 填入：

```env
NODE_VERSION=20
NEXT_PUBLIC_SITE_URL=https://你的项目.pages.dev
NEXT_PUBLIC_SITE_NAME=心灵小屋
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service role key
DATABASE_URL=你的 Supabase PostgreSQL 连接串
DIRECT_URL=你的 Supabase PostgreSQL 连接串
JWT_SECRET=至少 32 位随机字符串
ADMIN_EMAILS=你的管理员邮箱
MOCK_PAYMENT_ENABLED=true
PAYMENT_SECRET_KEY=至少 32 位随机字符串
PAYMENT_CONFIG_SECRET=至少 32 位随机字符串
AI_CHAT_ENABLED=false
WECHAT_PAY_ENABLED=false
ALIPAY_ENABLED=false
```

`.env.example` 已经整理好，可按它复制。

## 8. 绑定 pages.dev 域名

Cloudflare Pages 首次部署后会自动生成：

```text
https://项目名.pages.dev
```

把这个地址同步到：

- `NEXT_PUBLIC_SITE_URL`
- Supabase Auth Site URL
- Supabase Auth Redirect URLs

## 9. 正式上线测试步骤

1. 打开首页。
2. 注册/登录账号。
3. 用 `ADMIN_EMAILS` 中的邮箱登录，访问 `/admin`。
4. 进入测评中心。
5. 完成任意测评。
6. 查看基础报告。
7. 点击解锁高级报告。
8. 进入收银台。
9. Mock 支付生成二维码后，点击“我已支付”。
10. 确认跳转支付成功页。
11. 回到报告页，确认高级报告已解锁。
12. 进入后台订单/会员页面，确认状态更新。

## 10. 上线检查清单

- `npm install` 正常。
- `npm run typecheck` 通过。
- `npm run lint` 通过。
- `npm run build` 通过。
- `npm run build:cloudflare` 通过。
- Supabase SQL 已导入。
- RLS 已启用。
- Supabase Auth URL 已配置。
- Edge Function 已部署或确认暂不需要。
- Cloudflare 环境变量已配置。
- `MOCK_PAYMENT_ENABLED=true` 仅用于测试期。
- `AI_CHAT_ENABLED=false`，前台默认隐藏 AI 聊天。
- `ADMIN_EMAILS` 已填写管理员邮箱。
- GitHub 仓库没有 `.env.local`、`node_modules`、`.next`。

## 管理员初始化方式

不需要手动改数据库。把管理员邮箱写入：

```env
ADMIN_EMAILS=admin@example.com
```

然后用这个邮箱注册/登录，系统会自动识别为管理员。登录后访问：

```text
/admin
```
