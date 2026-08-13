-- categories.budget_amount_minor (01_initial_finance_schema.sql) only ever
-- stored a single currency-less budget, assumed EUR by convention before
-- ADR-060 introduced per-movement currencies. This migration adds a
-- per-currency budgets table (up to 3 currencies per category, enforced
-- below) without touching the existing column: it stays in place as
-- historical data and nothing writes to it anymore.
create table public.category_budgets (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  budget_amount_minor bigint not null check (budget_amount_minor > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, currency)
);

create index category_budgets_category_idx on public.category_budgets(category_id);

alter table public.category_budgets enable row level security;

create policy category_budgets_select_member on public.category_budgets
  for select to authenticated
  using (exists (
    select 1 from public.categories c
    where c.id = category_budgets.category_id
      and public.is_active_space_member(c.space_id)
  ));

revoke insert, update, delete on public.category_budgets from authenticated;
grant select on public.category_budgets to authenticated;
revoke all on public.category_budgets from anon;

-- Backfill: existing single-currency budgets were always EUR (the only
-- currency the app supported before ADR-060).
insert into public.category_budgets
  (category_id, currency, budget_amount_minor, created_by, created_at, updated_at)
select id, 'EUR', budget_amount_minor, created_by, created_at, updated_at
from public.categories
where budget_amount_minor is not null;

-- Sets or updates a category's budget in one currency. Direct table writes
-- are revoked above (same rationale as update_category_budget in
-- 03_shared_category_budget.sql: any active space member may manage a
-- shared category's budget without gaining rights over its other fields),
-- and this also enforces the 3-currencies-per-category product limit.
create or replace function public.set_category_budget(
  p_category_id uuid,
  p_currency text,
  p_budget_amount_minor bigint
)
returns public.category_budgets
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_space_id uuid;
  other_currency_count integer;
  result public.category_budgets;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_budget_amount_minor <= 0 then
    raise exception 'budget must be greater than zero';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid currency code';
  end if;

  select space_id into target_space_id
    from public.categories
   where id = p_category_id
     and is_archived = false;

  if target_space_id is null or not public.is_active_space_member(target_space_id) then
    raise exception 'category not found or access denied';
  end if;

  select count(*) into other_currency_count
    from public.category_budgets
   where category_id = p_category_id
     and currency <> p_currency;

  if other_currency_count >= 3 then
    raise exception 'maximum of 3 budget currencies per category';
  end if;

  insert into public.category_budgets
    (category_id, currency, budget_amount_minor, created_by)
  values (p_category_id, p_currency, p_budget_amount_minor, current_user_id)
  on conflict (category_id, currency)
    do update set budget_amount_minor = excluded.budget_amount_minor,
                  updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_category_budget(uuid, text, bigint) from public, anon;
grant execute on function public.set_category_budget(uuid, text, bigint) to authenticated;

-- Removes a category's budget in one currency.
create or replace function public.remove_category_budget(
  p_category_id uuid,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_space_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select space_id into target_space_id
    from public.categories
   where id = p_category_id;

  if target_space_id is null or not public.is_active_space_member(target_space_id) then
    raise exception 'category not found or access denied';
  end if;

  delete from public.category_budgets
   where category_id = p_category_id
     and currency = p_currency;
end;
$$;

revoke all on function public.remove_category_budget(uuid, text) from public, anon;
grant execute on function public.remove_category_budget(uuid, text) to authenticated;
