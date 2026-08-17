-- Cuentas de dinero: el segundo eje de clasificación de un movimiento, junto
-- a la categoría. Es opcional —un movimiento sin cuenta sigue siendo válido—
-- y cada cuenta lleva su propio saldo (saldo inicial más ingresos menos
-- gastos asignados).
--
-- El nombre `money_accounts` evita la colisión con «cuenta de usuario», que es
-- lo que ya significa «account» en el código de sincronización
-- (`supabaseRemoteAccountGateway`, `restoreRemoteAccount`, `local_sync_account`).
--
-- La cuenta pertenece al espacio, como la categoría: ambos miembros la ven y
-- solo su autor la edita o archiva. La moneda queda fijada en la cuenta, de
-- modo que un saldo nunca mezcla divisas (ADR-060 dejó pendiente el desglose
-- entre monedas para los agregados; una cuenta no lo necesita porque es
-- monomoneda por definición).
--
-- A diferencia de SQLite, aquí sí se declara la clave foránea compuesta
-- `(money_account_id, space_id)`: con `match simple` no se evalúa cuando la
-- columna opcional es nula, así que protege exactamente el caso que importa
-- —asignar una cuenta de otro espacio— sin estorbar al movimiento sin cuenta.

create table public.money_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 80),
  kind text not null check (kind in ('cash', 'bank', 'debit', 'credit', 'savings')),
  icon text not null,
  color_token text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- Admite cero y negativos: una tarjeta de crédito empieza con deuda.
  opening_balance_minor bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  source_installation_id text not null,
  source_local_id text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  unique (space_id, source_installation_id, source_local_id)
);

create index money_accounts_space_active_idx
  on public.money_accounts(space_id, is_archived, name);

alter table public.transactions
  add column money_account_id uuid;
alter table public.transactions
  add constraint transactions_money_account_fkey
  foreign key (money_account_id, space_id)
  references public.money_accounts(id, space_id) on delete restrict;

alter table public.recurring_transaction_series
  add column money_account_id uuid;
alter table public.recurring_transaction_series
  add constraint recurring_series_money_account_fkey
  foreign key (money_account_id, space_id)
  references public.money_accounts(id, space_id) on delete restrict;

create index transactions_money_account_idx
  on public.transactions(money_account_id, is_archived, occurred_on desc)
  where money_account_id is not null;

alter table public.money_accounts enable row level security;

-- Misma tríada que categorías y movimientos: leer exige membresía activa,
-- escribir exige además ser el autor. No hay política de borrado: eliminar
-- una cuenta es archivarla.
create policy money_accounts_select_member on public.money_accounts
  for select to authenticated
  using (public.is_active_space_member(space_id));

create policy money_accounts_insert_author on public.money_accounts
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

create policy money_accounts_update_author on public.money_accounts
  for update to authenticated
  using (
    created_by = (select auth.uid())
    and public.is_active_space_member(space_id)
  )
  with check (
    created_by = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

revoke all on table public.money_accounts from anon;
grant select, insert, update on table public.money_accounts to authenticated;
