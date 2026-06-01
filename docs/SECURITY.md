# 安全策略

## JWT 认证

- 使用 Supabase Auth。
- 服务端通过 `supabase.auth.getUser()` 校验 JWT。
- `middleware.ts` 保护 `/account` 与 `/admin`。

## 权限控制

- RLS 策略位于 `supabase/rls.sql`。
- 用户只能访问自己的报告、订单、支付记录与会员状态。
- 管理员通过 `ADMIN_EMAILS` 同步角色。

## 防 SQL 注入

- 运行时访问数据库使用 Supabase Query Builder。
- 数据库结构由 Prisma Schema 管理，避免拼接 SQL。

## 防 XSS

- React 默认转义用户可见文本。
- 后台文章发布接口对 HTML 进行基础清洗。
- `next.config.ts` 配置 CSP、`X-Content-Type-Options`、`Referrer-Policy`、HSTS。

## 防刷接口

- `lib/security.ts` 提供 API rate limit。
- 生产环境建议叠加 Cloudflare WAF、Bot Fight Mode、Turnstile。

## 支付安全

- 支付回调只在服务端处理。
- 订单开通权益使用 Service Role。
- 回调按订单号幂等处理。
- 后台可写入收款通道配置；私钥/API Key 由 `PAYMENT_CONFIG_SECRET` 加密后保存到 `system_configs`。
- 页面只显示支付密钥脱敏状态，不回显真实私钥。
- `PAYMENT_CONFIG_SECRET` 与 `SUPABASE_SERVICE_ROLE_KEY` 仍只写入部署平台环境变量。
