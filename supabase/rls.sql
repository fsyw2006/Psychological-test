-- Soul House RLS policies
-- Run after schema creation and seed data.

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.results enable row level security;
alter table public.articles enable row level security;
alter table public.article_favorites enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.memberships enable row level security;
alter table public.admins enable row level security;
alter table public.system_configs enable row level security;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
set search_path = public, auth
as $$
  select id from public.users where auth_user_id = (select auth.uid()) limit 1
$$;

create or replace function public.current_app_is_admin()
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.users u
    left join public.admins a on a.user_id = u.id
    where u.auth_user_id = (select auth.uid())
      and u.role = 'ADMIN'
      and coalesce(a.active, true) = true
  )
$$;

create policy "public read published tests"
on public.tests for select
using (status = 'PUBLISHED' or public.current_app_is_admin());

create policy "public read test categories"
on public.categories for select
using (true);

create policy "public read published questions"
on public.questions for select
using (
  exists (
    select 1 from public.tests t
    where t.id = questions.test_id
      and (t.status = 'PUBLISHED' or public.current_app_is_admin())
  )
);

create policy "public read published articles"
on public.articles for select
using (status = 'PUBLISHED' or public.current_app_is_admin());

create policy "users read own article favorites"
on public.article_favorites for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users create own article favorites"
on public.article_favorites for insert
with check (user_id = public.current_app_user_id());

create policy "users delete own article favorites"
on public.article_favorites for delete
using (user_id = public.current_app_user_id());

create policy "users read own profile"
on public.users for select
using (auth_user_id = auth.uid() or public.current_app_is_admin());

create policy "users update own profile"
on public.users for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "users read own answers"
on public.answers for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users create own answers"
on public.answers for insert
with check (user_id = public.current_app_user_id());

create policy "users read own results"
on public.results for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users create own results"
on public.results for insert
with check (user_id = public.current_app_user_id());

create policy "users update own free result unlock status through service"
on public.results for update
using (false);

create policy "users create own profile"
on public.users for insert
with check (auth_user_id = auth.uid());

create policy "users read own orders"
on public.orders for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users create own orders"
on public.orders for insert
with check (user_id = public.current_app_user_id());

create policy "users read own payments"
on public.payments for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users read own memberships"
on public.memberships for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "admins manage categories"
on public.categories for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "admins manage tests"
on public.tests for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "admins manage questions"
on public.questions for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "admins manage articles"
on public.articles for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "admins read payments"
on public.payments for select
using (public.current_app_is_admin());

create policy "admins manage configs"
on public.system_configs for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "admins manage admins"
on public.admins for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create index if not exists answers_question_id_idx on public.answers(question_id);
create index if not exists answers_user_id_idx on public.answers(user_id);
create index if not exists articles_author_id_idx on public.articles(author_id);
create index if not exists orders_plan_id_idx on public.orders(plan_id);
create index if not exists orders_result_id_idx on public.orders(result_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists user_reports_result_id_idx on public.user_reports(result_id);



alter table public.plans enable row level security;
alter table public.report_templates enable row level security;
alter table public.user_reports enable row level security;
alter table public.usage_limits enable row level security;
alter table public.admin_configs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_records enable row level security;

create policy "public read active plans"
on public.plans for select
using (is_active = true or public.current_app_is_admin());

create policy "admins manage plans"
on public.plans for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "admins manage report templates"
on public.report_templates for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "users read own user reports"
on public.user_reports for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users read own usage limits"
on public.usage_limits for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "admins manage admin configs"
on public.admin_configs for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

create policy "users read own ai conversations"
on public.ai_conversations for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

create policy "users read own ai messages"
on public.ai_messages for select
using (
  exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and (c.user_id = public.current_app_user_id() or public.current_app_is_admin())
  )
);

create policy "users read own ai usage"
on public.ai_usage_records for select
using (user_id = public.current_app_user_id() or public.current_app_is_admin());

