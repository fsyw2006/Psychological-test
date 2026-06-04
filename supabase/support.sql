-- Soul House support inbox tables
-- Run this in Supabase SQL Editor before deploying the support inbox feature.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  visitor_id text,
  topic text not null default 'other',
  contact_name text,
  contact_value text,
  status text not null default 'OPEN',
  last_message_at timestamp(3) not null default current_timestamp,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null,
  content text not null,
  admin_user_id uuid references public.users(id) on delete set null,
  created_at timestamp(3) not null default current_timestamp
);

create index if not exists support_tickets_user_id_idx
on public.support_tickets(user_id);

create index if not exists support_tickets_visitor_id_idx
on public.support_tickets(visitor_id);

create index if not exists support_tickets_status_idx
on public.support_tickets(status);

create index if not exists support_tickets_last_message_at_idx
on public.support_tickets(last_message_at desc);

create index if not exists support_messages_ticket_id_created_at_idx
on public.support_messages(ticket_id, created_at);

alter table public.support_tickets
  drop constraint if exists support_tickets_topic_check;

alter table public.support_tickets
  add constraint support_tickets_topic_check
  check (topic in ('account', 'membership', 'payment', 'report', 'assessment', 'ai', 'other'));

alter table public.support_tickets
  drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('OPEN', 'REPLIED', 'RESOLVED'));

alter table public.support_messages
  drop constraint if exists support_messages_sender_check;

alter table public.support_messages
  add constraint support_messages_sender_check
  check (sender in ('user', 'admin'));

grant select, insert, update, delete on table public.support_tickets to authenticated, service_role;
grant select, insert, update, delete on table public.support_messages to authenticated, service_role;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "admins manage support tickets" on public.support_tickets;
create policy "admins manage support tickets"
on public.support_tickets for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());

drop policy if exists "admins manage support messages" on public.support_messages;
create policy "admins manage support messages"
on public.support_messages for all
using (public.current_app_is_admin())
with check (public.current_app_is_admin());
