alter type "MembershipPlan" add value if not exists 'QUARTERLY';
alter type "ProductType" add value if not exists 'MEMBERSHIP_QUARTERLY';

insert into public.plans (
  slug,
  name,
  plan_type,
  price_cents,
  period,
  description,
  features,
  is_active,
  sort_order,
  updated_at
) values (
  'quarterly',
  '季会员',
  'quarterly',
  2380,
  '每季',
  '适合连续 3 个月使用心理测评与高级报告。',
  array['3 个月会员权益', '无限测评', '高级报告', '历史记录']::text[],
  true,
  2,
  now()
) on conflict (slug) do update set
  name = excluded.name,
  plan_type = excluded.plan_type,
  price_cents = excluded.price_cents,
  period = excluded.period,
  description = excluded.description,
  features = excluded.features,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.system_configs (key, value, description, updated_at)
values (
  'pricing_plans',
  '{
    "plans": [
      {"slug":"free","name":"免费版","priceCents":0,"period":"每日 1 次","description":"适合首次体验心理测评与基础报告。","features":["每日 1 次测评","查看基础报告","文章阅读与收藏"]},
      {"slug":"monthly","name":"月会员","priceCents":1990,"period":"每月","description":"适合持续探索人格、情绪与关系议题。","features":["无限测评","高级报告","历史记录","专属内容"],"highlighted":true},
      {"slug":"quarterly","name":"季会员","priceCents":2380,"period":"每季","description":"适合连续 3 个月使用心理测评与高级报告。","features":["3 个月会员权益","无限测评","高级报告","历史记录"]},
      {"slug":"yearly","name":"年会员","priceCents":16800,"period":"每年","description":"适合建立长期心理成长档案。","features":["无限测评","高级报告","心理成长档案","优先体验功能"]},
      {"slug":"single-report","name":"单次解锁","priceCents":390,"period":"当前报告","description":"无需开通会员，解锁当前测评高级分析。","features":["解锁当前报告","无需订阅","永久查看该报告"]}
    ],
    "dailyFreeTests": 1
  }'::jsonb,
  '会员套餐与单次解锁定价',
  now()
) on conflict (key) do nothing;

update public.system_configs
set
  value = jsonb_set(
    value,
    '{plans}',
    (
      select jsonb_agg(plan order by
        case plan->>'slug'
          when 'free' then 0
          when 'monthly' then 1
          when 'quarterly' then 2
          when 'yearly' then 3
          when 'single-report' then 4
          else 10
        end
      )
      from (
        select elem as plan
        from jsonb_array_elements(coalesce(value->'plans', '[]'::jsonb)) as existing(elem)
        where elem->>'slug' <> 'quarterly'
        union all
        select '{
          "slug":"quarterly",
          "name":"季会员",
          "priceCents":2380,
          "period":"每季",
          "description":"适合连续 3 个月使用心理测评与高级报告。",
          "features":["3 个月会员权益","无限测评","高级报告","历史记录"]
        }'::jsonb
      ) next_plans
    ),
    true
  ),
  updated_at = now()
where key = 'pricing_plans';
