begin;
select plan(12);

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
    select is_nullable = 'YES'
      from information_schema.columns
     where table_schema = 'public' and table_name = 'transactions' and column_name = 'created_by'
  ),
  'a transaction survives its author leaving: created_by admits null'
);
select ok(
  (
    select is_nullable = 'YES'
      from information_schema.columns
     where table_schema = 'public' and table_name = 'categories' and column_name = 'created_by'
  ),
  'a category survives its author leaving: created_by admits null'
);
select ok(
  (
    select is_nullable = 'YES'
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'recurring_transaction_series'
       and column_name = 'created_by'
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

select * from finish();
rollback;
