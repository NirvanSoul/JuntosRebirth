begin;
select plan(17);

select has_function(
  'public',
  'request_account_deletion',
  array[]::text[],
  'account deletion RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.request_account_deletion()',
    'EXECUTE'
  ),
  'anonymous users cannot request account deletion'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.request_account_deletion()',
    'EXECUTE'
  ),
  'authenticated users can request account deletion'
);
select ok(
  (
    select not attnotnull
      from pg_attribute
      join pg_class on pg_class.oid = pg_attribute.attrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where nspname = 'public' and relname = 'transactions' and attname = 'created_by'
  ),
  'a transaction survives its author leaving: created_by admits null'
);
select ok(
  (
    select not attnotnull
      from pg_attribute
      join pg_class on pg_class.oid = pg_attribute.attrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where nspname = 'public' and relname = 'categories' and attname = 'created_by'
  ),
  'a category survives its author leaving: created_by admits null'
);
select ok(
  (
    select not attnotnull
      from pg_attribute
      join pg_class on pg_class.oid = pg_attribute.attrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where nspname = 'public'
       and relname = 'recurring_transaction_series'
       and attname = 'created_by'
  ),
  'a recurring series survives its author leaving: created_by admits null'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and conname = 'transactions_created_by_fkey'
      and confdeltype = 'n'
  ),
  'deleting the author clears created_by on their transactions instead of blocking'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_created_by_fkey'
      and confdeltype = 'n'
  ),
  'deleting the author clears created_by on their categories instead of blocking'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.space_members'::regclass
      and conname = 'space_members_space_id_fkey'
      and confdeltype = 'r'
  ),
  'a space cannot be deleted while members still reference it, so the RPC must clear members first'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.request_account_deletion()'::regprocedure) ~ 'delete from public.import_items',
  'account deletion clears import_items before deleting the transactions/categories it references'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.request_account_deletion()'::regprocedure) ~ 'delete from public.import_batches',
  'account deletion clears import_batches before deleting the space it references'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.request_account_deletion()'::regprocedure) ~ 'delete from public.user_merchant_rules',
  'account deletion clears user_merchant_rules before deleting the space/category it references'
);

-- Las dos tablas añadidas después de la migración 06 repitieron el patrón
-- `not null references auth.users(id)` sin acción `on delete`, y bloqueaban
-- `auth.admin.deleteUser()` para cualquiera que hubiera estado en un espacio
-- compartido (migración 21).
select ok(
  (
    select not attnotnull
      from pg_attribute
      join pg_class on pg_class.oid = pg_attribute.attrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where nspname = 'public'
       and relname = 'transaction_notification_rules'
       and attname = 'created_by'
  ),
  'a notification rule survives its author leaving: created_by admits null'
);
select ok(
  (
    select not attnotnull
      from pg_attribute
      join pg_class on pg_class.oid = pg_attribute.attrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where nspname = 'public'
       and relname = 'category_budgets'
       and attname = 'created_by'
  ),
  'a category budget survives its author leaving: created_by admits null'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaction_notification_rules'::regclass
      and conname = 'transaction_notification_rules_created_by_fkey'
      and confdeltype = 'n'
  ),
  'deleting the author clears created_by on their notification rules instead of blocking the account deletion'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.category_budgets'::regclass
      and conname = 'category_budgets_created_by_fkey'
      and confdeltype = 'n'
  ),
  'deleting the author clears created_by on their category budgets instead of blocking the account deletion'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.request_account_deletion()'::regprocedure) ~ 'delete from public.login_attempts',
  'account deletion clears the login_attempts row, which no foreign key reaches because it is keyed by email'
);

select * from finish();
rollback;
