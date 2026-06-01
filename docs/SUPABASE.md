# Supabase 配置

## 1. 创建项目

在 Supabase 创建 PostgreSQL 项目，复制：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

写入 `.env`。

## 2. 初始化数据库

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

`prisma/schema.prisma` 包含完整模型：

- User
- Test
- Question
- Answer
- Result
- Article
- Category
- Order
- Payment
- Membership
- Admin
- SystemConfig
- ArticleFavorite

## 3. 启用 RLS

在 Supabase SQL Editor 执行：

```sql
-- supabase/rls.sql
```

策略说明：

- 公开读取已发布测评、题目与文章。
- 用户只能读取自己的结果、答案、订单、支付和会员状态。
- 管理员可管理测评、题目、文章与系统配置。
- 支付回调使用 Service Role 执行权益开通，避免客户端越权。

## 4. Supabase Auth

Authentication 设置：

- Site URL：生产域名，例如 `https://soul-house.pages.dev`
- Redirect URLs：
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

管理员账号：

```bash
ADMIN_EMAILS=admin@example.com,ops@example.com
```

当这些邮箱登录时，应用会同步为 `ADMIN` 角色。
