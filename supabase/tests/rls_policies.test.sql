begin;
select plan(12);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'spaces'),
  'spaces define RLS policies'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'space_members'),
  'space_members define RLS policies'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories'),
  'categories define RLS policies'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recurring_transaction_series'),
  'series define RLS policies'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'transactions'),
  'transactions define RLS policies'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'transactions'
      and policyname = 'transactions_insert_author'
  ),
  'transaction inserts validate authorship'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'categories'
      and policyname = 'categories_insert_author'
  ),
  'category inserts validate authorship'
);
select has_function(
  'public',
  'update_category_budget',
  array['uuid', 'bigint'],
  'shared category budget RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.update_category_budget(uuid,bigint)',
    'EXECUTE'
  ),
  'anonymous users cannot update a category budget'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.update_category_budget(uuid,bigint)',
    'EXECUTE'
  ),
  'any authenticated active space member can update a category budget, not only its author'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'spaces'
      and policyname = 'spaces_update_owner'
  ),
  'spaces_update_owner policy exists'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'space_members'
      and policyname = 'members_update_self_owner'
  ),
  'members_update_self_owner policy exists'
);

select * from finish();
rollback;

