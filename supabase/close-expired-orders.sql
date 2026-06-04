-- 可选修复脚本：把历史中超过 15 分钟仍未支付的订单关闭。
-- 新代码上线后，打开订单列表、查询支付、确认支付时都会自动处理过期订单。

alter table if exists public.orders
  add column if not exists expires_at timestamptz;

update public.orders
set
  expires_at = coalesce(expires_at, created_at + interval '15 minutes'),
  status = 'CLOSED'
where status = 'PENDING'
  and coalesce(expires_at, created_at + interval '15 minutes') <= now();

update public.payments p
set
  status = 'FAILED',
  trade_state = 'CLOSED',
  raw_payload = jsonb_build_object('reason', 'order_expired')
from public.orders o
where p.order_id = o.id
  and o.status = 'CLOSED'
  and p.status = 'PENDING';
