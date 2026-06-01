# 支付配置

项目内置微信支付 v3 Native 与支付宝 Page Pay。支付只走真实收款通道；未启用或未完整配置真实商户参数时，收银台会直接返回“通道未启用/参数未配置完整”的错误。

## 微信支付 v3

`.env`：

```bash
WECHAT_PAY_ENABLED=true
WECHAT_APP_ID=
WECHAT_MCH_ID=
WECHAT_API_V3_KEY=
WECHAT_SERIAL_NO=
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
WECHAT_PLATFORM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
WECHAT_NOTIFY_URL=https://your-domain.com/api/payments/wechat/callback
```

实现文件：

- `lib/payments/wechat.ts`
- `app/api/payments/wechat/create/route.ts`
- `app/api/payments/wechat/callback/route.ts`

支付成功后会调用 `activatePaidOrder`：

- 月会员：开通 1 个月会员
- 年会员：开通 1 年会员
- 单次解锁：设置当前报告 `is_unlocked=true`

## 支付宝

`.env`：

```bash
ALIPAY_ENABLED=true
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payments/alipay/callback
ALIPAY_RETURN_URL=https://your-domain.com/checkout/success
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

实现文件：

- `lib/payments/alipay.ts`
- `app/api/payments/alipay/create/route.ts`
- `app/api/payments/alipay/callback/route.ts`

## API

- `POST /api/payments/wechat/create`
- `POST /api/payments/wechat/callback`
- `POST /api/payments/alipay/create`
- `POST /api/payments/alipay/callback`
- `GET /api/payments/query?provider=wechat&orderNo=...`
- `GET /api/payments/refund-status?orderNo=...`
- `GET /api/admin/payments`：后台查看收款通道配置状态

## 后台收款通道

访问 `/admin/payments` 可以填写微信支付和支付宝的生产收款参数，查看是否启用、必要参数是否配置、回调地址和收款订单入口。

后台保存逻辑：

- 已连接 Supabase：写入 `system_configs` 表，key 为 `payment_channels`。
- 未连接 Supabase 的本地预览：写入服务进程内存，重启后丢失。
- `PAYMENT_CONFIG_SECRET` 存在时，私钥、API Key、公钥会加密后入库。
- 页面不会回显真实密钥，留空密钥字段表示不修改原值。

生产环境建议仍将 `PAYMENT_CONFIG_SECRET`、`SUPABASE_SERVICE_ROLE_KEY` 放在 Cloudflare 环境变量或 Secret 管理里。

## 生产注意事项

- 微信回调支持平台公钥验签，生产环境请配置 `WECHAT_PLATFORM_PUBLIC_KEY`。
- 回调必须使用 HTTPS 公网域名。
- `SUPABASE_SERVICE_ROLE_KEY` 只能存在服务端环境变量中。
- 订单回调是幂等的，已支付订单不会重复开通权益。
