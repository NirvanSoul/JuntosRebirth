-- Una cuenta puede guardar varias monedas.
--
-- Hay bancos que mantienen divisas distintas dentro de la misma cuenta, y cada
-- una lleva su propio saldo: sumarlas no significaría nada mientras no exista
-- conversión. La tabla hija sigue el patrón de `category_budgets`, que ya
-- resuelve lo mismo para los presupuestos.
--
-- `money_accounts.currency` se conserva como moneda principal —la que encabeza
-- la tarjeta y se propone al registrar un movimiento—, pero
-- `opening_balance_minor` deja de ser la fuente de verdad del saldo inicial:
-- pasa a vivir siempre aquí, incluida la moneda principal, para no mantener
-- dos fuentes del mismo dato.

create table public.money_account_balances (
  id uuid primary key default extensions.gen_random_uuid(),
  money_account_id uuid not null
    references public.money_accounts(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- Admite cero y negativos: quien arrastra una deuda escribe el signo.
  opening_balance_minor bigint not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (money_account_id, currency)
);

create index money_account_balances_account_idx
  on public.money_account_balances(money_account_id, position);

-- Cada cuenta ya existente conserva su moneda como la primera de la lista.
insert into public.money_account_balances (
  money_account_id, space_id, currency, opening_balance_minor, position,
  created_at, updated_at
)
select id, space_id, currency, opening_balance_minor, 0, created_at, updated_at
  from public.money_accounts
on conflict (money_account_id, currency) do nothing;

alter table public.money_account_balances enable row level security;

-- Las mismas reglas que la cuenta a la que pertenece: leer exige membresía
-- activa y escribir se hace por el RPC de sincronización, que es `security
-- definer`. No hay política de borrado porque las filas se retiran en cascada
-- con su cuenta.
create policy money_account_balances_select_member
  on public.money_account_balances
  for select to authenticated
  using (public.is_active_space_member(space_id));

create policy money_account_balances_insert_member
  on public.money_account_balances
  for insert to authenticated
  with check (public.is_active_space_member(space_id));

create policy money_account_balances_update_member
  on public.money_account_balances
  for update to authenticated
  using (public.is_active_space_member(space_id))
  with check (public.is_active_space_member(space_id));

revoke all on table public.money_account_balances from anon;
grant select, insert, update on table public.money_account_balances to authenticated;

alter table public.money_account_balances replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'money_account_balances'
  ) then
    alter publication supabase_realtime add table public.money_account_balances;
  end if;
end;
$$;
