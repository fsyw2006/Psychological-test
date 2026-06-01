# API 清单

## 测评

- `GET /api/tests`：测评列表
- `GET /api/tests/:slug`：测评详情
- `POST /api/results`：提交测评并生成报告
- `GET /api/results/:id`：查看报告

提交测评：

```json
{
  "testSlug": "phq-9",
  "answers": [
    {
      "questionId": "uuid-or-demo-id",
      "values": ["1"]
    }
  ]
}
```

## 文章

- `GET /api/articles?q=&category=`：文章搜索与分类筛选
- `POST /api/articles/:slug/favorite`：收藏/取消收藏文章
- `POST /api/admin/articles`：后台发布文章

## 订单

- `POST /api/orders`：创建订单
- `GET /api/orders`：我的订单
- `GET /api/orders/:id`：订单详情

创建订单：

```json
{
  "plan": "monthly",
  "resultId": "optional-report-id"
}
```

## 支付

- `POST /api/payments/wechat/create`
- `POST /api/payments/wechat/callback`
- `POST /api/payments/alipay/create`
- `POST /api/payments/alipay/callback`
- `GET /api/payments/query`
- `GET /api/payments/refund-status`

## 管理后台

- `GET /api/admin/stats`
- `GET /api/admin/tests`
- `POST /api/admin/tests`
- `GET /api/admin/payments`
- `POST /api/admin/articles`

后台接口要求 Supabase Auth 登录且用户角色为 `ADMIN`。
