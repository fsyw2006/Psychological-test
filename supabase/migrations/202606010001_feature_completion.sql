alter table if exists orders add column if not exists related_report_id uuid;
alter table if exists orders add column if not exists plan_id uuid;
alter table if exists orders add column if not exists payment_channel text;

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  plan_type text not null,
  price_cents integer not null default 0,
  period text not null,
  description text not null,
  features text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_plan_id_fkey'
  ) then
    alter table orders
      add constraint orders_plan_id_fkey
      foreign key (plan_id) references plans(id) on delete set null;
  end if;
end $$;

create table if not exists report_templates (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  result_type text not null,
  basic_content jsonb not null default '{}',
  premium_content jsonb not null default '{}',
  suggestions jsonb not null default '[]',
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(test_id, result_type)
);

create table if not exists user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  result_id uuid not null references results(id) on delete cascade,
  access_type report_access_type not null default 'FREE',
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, result_id)
);

create table if not exists usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  test_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create table if not exists admin_configs (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  token_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  model text not null,
  token_input integer not null default 0,
  token_output integer not null default 0,
  total_cost numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists plans_active_sort_idx on plans(is_active, sort_order);
create index if not exists report_templates_test_active_idx on report_templates(test_id, is_active);
create index if not exists usage_limits_date_idx on usage_limits(date);
create index if not exists ai_conversations_user_updated_idx on ai_conversations(user_id, updated_at);
create index if not exists ai_messages_conversation_created_idx on ai_messages(conversation_id, created_at);
create index if not exists ai_usage_records_user_created_idx on ai_usage_records(user_id, created_at);
