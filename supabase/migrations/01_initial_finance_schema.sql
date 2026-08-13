create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  avatar_url text,
  locale text not null default 'es-ES',
  default_currency text not null default 'EUR' check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  type text not null check (type in ('personal', 'couple', 'other')),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid not null references auth.users(id),
  source_installation_id text,
  source_local_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (created_by, source_installation_id, source_local_id)
);

create unique index spaces_one_active_personal_per_user_idx
  on public.spaces(created_by)
  where type = 'personal' and archived_at is null;

create table public.space_members (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  status text not null check (status in ('pending', 'active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table public.space_local_sources (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  local_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, installation_id, local_id)
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 80),
  icon text not null,
  color_token text not null,
  budget_amount_minor bigint check (budget_amount_minor > 0),
  created_by uuid not null references auth.users(id),
  is_default boolean not null default false,
  template_key text,
  source_installation_id text not null,
  source_local_id text not null,
  source_local_category_id text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  unique (space_id, source_installation_id, source_local_id)
);

create table public.recurring_transaction_series (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  category_id uuid not null,
  created_by uuid not null references auth.users(id),
  type text not null check (type in ('expense', 'income')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  title text not null check (length(title) <= 160),
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  starts_on date not null,
  generated_occurrences integer not null check (generated_occurrences >= 0),
  next_occurrence_on date not null,
  source_installation_id text not null,
  source_local_id text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (space_id, source_installation_id, source_local_id),
  foreign key (category_id, space_id)
    references public.categories(id, space_id) on delete restrict
);

create table public.transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  category_id uuid not null,
  created_by uuid not null references auth.users(id),
  type text not null check (type in ('expense', 'income')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  title text not null check (length(title) <= 160),
  occurred_on date not null,
  recurrence text not null check (
    recurrence in ('once', 'weekly', 'biweekly', 'monthly', 'custom')
  ),
  recurrence_series_id uuid references public.recurring_transaction_series(id) on delete restrict,
  recurrence_group_id text,
  source_installation_id text not null,
  source_local_id text not null,
  source_local_transaction_id text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  unique (space_id, source_installation_id, source_local_id),
  unique (recurrence_series_id, occurred_on),
  foreign key (category_id, space_id)
    references public.categories(id, space_id) on delete restrict
);

create table public.guest_migration_batches (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  status text not null check (status in ('processing', 'completed')),
  space_count integer not null default 0,
  category_count integer not null default 0,
  series_count integer not null default 0,
  transaction_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, id)
);

create index space_members_user_status_idx on public.space_members(user_id, status);
create index space_members_space_status_idx on public.space_members(space_id, status);
create index categories_space_archived_idx on public.categories(space_id, is_archived);
create index transactions_space_date_idx on public.transactions(space_id, occurred_on desc);
create index transactions_category_date_idx on public.transactions(space_id, category_id, occurred_on desc);
create index recurring_series_due_idx on public.recurring_transaction_series(space_id, is_archived, next_occurrence_on);

create or replace function public.is_active_space_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_members
    where space_id = target_space_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Usuario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles(id, display_name)
select
  id,
  coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 'Usuario')
from auth.users
on conflict (id) do nothing;

create or replace function public.ensure_personal_space(
  p_name text default 'Personal',
  p_currency text default 'EUR'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  personal_space_id uuid;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  select id into personal_space_id
    from public.spaces
   where created_by = current_user_id and type = 'personal' and archived_at is null;

  if personal_space_id is null then
    insert into public.spaces(name, type, currency, created_by)
    values (p_name, 'personal', p_currency, current_user_id)
    returning id into personal_space_id;
  end if;

  insert into public.space_members(space_id, user_id, role, status)
  values (personal_space_id, current_user_id, 'owner', 'active')
  on conflict (space_id, user_id) do update
    set role = 'owner', status = 'active', left_at = null, updated_at = now();
  return personal_space_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_local_sources enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_transaction_series enable row level security;
alter table public.transactions enable row level security;
alter table public.guest_migration_batches enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy spaces_select_member on public.spaces for select to authenticated
  using (public.is_active_space_member(id));
create policy spaces_insert_creator on public.spaces for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy spaces_update_owner on public.spaces for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy members_select_member on public.space_members for select to authenticated
  using (public.is_active_space_member(space_id));
create policy members_insert_space_creator on public.space_members for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.spaces
       where spaces.id = space_id and spaces.created_by = (select auth.uid())
    )
  );
create policy members_update_self_owner on public.space_members for update to authenticated
  using (user_id = (select auth.uid()) and role = 'owner')
  with check (user_id = (select auth.uid()) and role = 'owner');

create policy space_sources_own on public.space_local_sources for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy categories_select_member on public.categories for select to authenticated
  using (public.is_active_space_member(space_id));
create policy categories_insert_author on public.categories for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_active_space_member(space_id));
create policy categories_update_author on public.categories for update to authenticated
  using (created_by = (select auth.uid()) and public.is_active_space_member(space_id))
  with check (created_by = (select auth.uid()) and public.is_active_space_member(space_id));

create policy series_select_member on public.recurring_transaction_series for select to authenticated
  using (public.is_active_space_member(space_id));
create policy series_insert_author on public.recurring_transaction_series for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_active_space_member(space_id));
create policy series_update_author on public.recurring_transaction_series for update to authenticated
  using (created_by = (select auth.uid()) and public.is_active_space_member(space_id))
  with check (created_by = (select auth.uid()) and public.is_active_space_member(space_id));

create policy transactions_select_member on public.transactions for select to authenticated
  using (public.is_active_space_member(space_id));
create policy transactions_insert_author on public.transactions for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_active_space_member(space_id));
create policy transactions_update_author on public.transactions for update to authenticated
  using (created_by = (select auth.uid()) and public.is_active_space_member(space_id))
  with check (created_by = (select auth.uid()) and public.is_active_space_member(space_id));

create policy batches_own on public.guest_migration_batches for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.profiles, public.spaces, public.space_members, public.space_local_sources,
  public.categories, public.recurring_transaction_series, public.transactions,
  public.guest_migration_batches from anon;
grant select, insert, update on public.profiles, public.spaces, public.space_members, public.space_local_sources,
  public.categories, public.recurring_transaction_series, public.transactions,
  public.guest_migration_batches to authenticated;
grant execute on function public.is_active_space_member(uuid) to authenticated;
grant execute on function public.ensure_personal_space(text, text) to authenticated;
