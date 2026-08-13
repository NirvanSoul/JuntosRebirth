begin;
select plan(10);

select has_table('public', 'category_budgets', 'category_budgets exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.category_budgets'::regclass),
  'category_budgets has RLS enabled'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'category_budgets'
      and policyname = 'category_budgets_select_member'
  ),
  'category_budgets_select_member policy exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.category_budgets'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(category_id, currency)%'
  ),
  'category_budgets enforces one budget per category and currency'
);

select has_function(
  'public',
  'set_category_budget',
  array['uuid', 'text', 'bigint'],
  'set_category_budget RPC exists'
);
select has_function(
  'public',
  'remove_category_budget',
  array['uuid', 'text'],
  'remove_category_budget RPC exists'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.set_category_budget(uuid,text,bigint)',
    'EXECUTE'
  ),
  'anonymous users cannot set a category budget'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.set_category_budget(uuid,text,bigint)',
    'EXECUTE'
  ),
  'any authenticated active space member can set a category budget'
);
select ok(
  not has_table_privilege('authenticated', 'public.category_budgets', 'INSERT'),
  'authenticated users cannot insert into category_budgets directly, only via set_category_budget'
);
select ok(
  has_table_privilege('authenticated', 'public.category_budgets', 'SELECT'),
  'authenticated users can read category_budgets'
);

select * from finish();
rollback;
