-- Repair paid orders whose entitlements were not applied.
-- Run this once in Supabase SQL Editor after deploying the payment fix.

update public.results as r
set
  is_unlocked = true,
  access_type = 'SINGLE_PURCHASE'::"ReportAccessType",
  updated_at = now()
from public.orders as o
where
  o.result_id = r.id
  and o.status = 'PAID'::"OrderStatus"
  and o.product_type = 'REPORT_UNLOCK'::"ProductType"
  and r.is_unlocked = false;

insert into public.memberships (
  user_id,
  plan,
  status,
  starts_at,
  ends_at,
  order_id
)
select
  o.user_id,
  case
    when o.product_type = 'MEMBERSHIP_MONTHLY'::"ProductType" then 'MONTHLY'::"MembershipPlan"
    when o.product_type = 'MEMBERSHIP_QUARTERLY'::"ProductType" then 'QUARTERLY'::"MembershipPlan"
    else 'YEARLY'::"MembershipPlan"
  end as plan,
  'ACTIVE'::"MembershipStatus" as status,
  coalesce(o.paid_at, o.created_at, now()) as starts_at,
  case
    when o.product_type = 'MEMBERSHIP_MONTHLY'::"ProductType"
      then coalesce(o.paid_at, o.created_at, now()) + interval '1 month'
    when o.product_type = 'MEMBERSHIP_QUARTERLY'::"ProductType"
      then coalesce(o.paid_at, o.created_at, now()) + interval '3 months'
    else coalesce(o.paid_at, o.created_at, now()) + interval '1 year'
  end as ends_at,
  o.id as order_id
from public.orders as o
where
  o.status = 'PAID'::"OrderStatus"
  and o.product_type in (
    'MEMBERSHIP_MONTHLY'::"ProductType",
    'MEMBERSHIP_QUARTERLY'::"ProductType",
    'MEMBERSHIP_YEARLY'::"ProductType"
  )
  and not exists (
    select 1
    from public.memberships as m
    where m.order_id = o.id
  );
