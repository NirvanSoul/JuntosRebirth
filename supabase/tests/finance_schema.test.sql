begin;
select plan(14);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'spaces', 'spaces exists');
select has_table('public', 'space_members', 'space_members exists');
select has_table('public', 'categories', 'categories exists');
select has_table('public', 'recurring_transaction_series', 'recurring series exists');
select has_table('public', 'transactions', 'transactions exists');
select has_table('public', 'guest_migration_batches', 'migration batches exist');
select has_function(
  'public',
  'migrate_guest_data',
  array['uuid', 'text', 'jsonb', 'jsonb', 'jsonb', 'jsonb'],
  'guest migration RPC exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
  'categories has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.transactions'::regclass),
  'transactions has RLS enabled'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%(category_id, space_id)%'
  ),
  'transactions enforce category and space together'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.migrate_guest_data(uuid,text,jsonb,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot migrate guest data'
);

select has_function('public', 'handle_new_user', 'handle_new_user exists');
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anonymous users cannot execute handle_new_user'
);

select * from finish();
rollback;

