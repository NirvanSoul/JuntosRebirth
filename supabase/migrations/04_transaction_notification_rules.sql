-- Notification rules are a per-space setting, not authored content like a
-- category's name or a transaction's amount: any active member should be
-- able to turn a rule on or off or adjust its timing, not only whoever
-- created the row first. Unlike update_category_budget (03_shared_category_budget.sql), no
-- narrower function is needed here because the whole row is the shared
-- setting, so insert/update simply require active membership instead of
-- authorship.
create table public.transaction_notification_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('expense', 'income')),
  is_enabled boolean not null default true,
  days_before integer not null check (days_before >= 0),
  times jsonb not null,
  created_by uuid not null references auth.users(id),
  source_installation_id text not null,
  source_local_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, transaction_type),
  unique (space_id, source_installation_id, source_local_id)
);

create index transaction_notification_rules_space_idx
  on public.transaction_notification_rules(space_id);

alter table public.transaction_notification_rules enable row level security;

create policy notification_rules_select_member
  on public.transaction_notification_rules for select to authenticated
  using (public.is_active_space_member(space_id));
create policy notification_rules_insert_member
  on public.transaction_notification_rules for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_active_space_member(space_id)
  );
create policy notification_rules_update_member
  on public.transaction_notification_rules for update to authenticated
  using (public.is_active_space_member(space_id))
  with check (public.is_active_space_member(space_id));

revoke all on public.transaction_notification_rules from anon;
grant select, insert, update on public.transaction_notification_rules to authenticated;
