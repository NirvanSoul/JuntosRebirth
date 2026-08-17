begin;
select plan(14);

select has_table(
  'public', 'money_accounts',
  'money accounts are stored server-side, not only on the device'
);
select has_column(
  'public', 'money_accounts', 'opening_balance_minor',
  'an account keeps the balance it already had before any movement'
);
select col_not_null(
  'public', 'money_accounts', 'currency',
  'an account is single-currency, which is what makes its balance meaningful'
);
select has_index(
  'public', 'money_accounts', 'money_accounts_space_active_idx',
  'the active accounts of a space are indexed for the list and the carousel'
);

select has_column(
  'public', 'transactions', 'money_account_id',
  'a transaction can be assigned to an account'
);
select ok(
  (
    select is_nullable = 'YES'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'money_account_id'
  ),
  'the account is optional: a transaction without one is still valid'
);
select has_column(
  'public', 'recurring_transaction_series', 'money_account_id',
  'a recurring series carries the account down to every occurrence it materializes'
);

-- La foránea compuesta es la garantía que SQLite no puede dar: impide asignar
-- a un movimiento la cuenta de otro espacio.
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'transactions_money_account_fkey'
      and contype = 'f'
      and array_length(conkey, 1) = 2
  ),
  'a transaction can only reference an account of its own space'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'recurring_series_money_account_fkey'
      and contype = 'f'
      and array_length(conkey, 1) = 2
  ),
  'the same composite guard protects recurring series'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.money_accounts'::regclass
  ),
  'row level security is enabled on money accounts'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'money_accounts'
      and policyname = 'money_accounts_select_member'
      and qual like '%is_active_space_member%'
  ),
  'reading an account requires an active membership in its space'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'money_accounts'
      and policyname = 'money_accounts_update_author'
      and qual like '%auth.uid%'
  ),
  'only the author edits or archives an account, as with categories'
);
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'money_accounts'
      and cmd = 'DELETE'
  ),
  'there is no delete policy: removing an account means archiving it'
);

-- La firma anterior debe desaparecer: dos candidatas harían ambigua la
-- llamada desde PostgREST, que resuelve por nombre de parámetro.
select ok(
  (
    select count(*) = 1
    from pg_proc
    where proname = 'sync_couple_space_data'
      and pronamespace = 'public'::regnamespace
  ),
  'only the account-aware signature of sync_couple_space_data survives'
);

select * from finish();
rollback;
