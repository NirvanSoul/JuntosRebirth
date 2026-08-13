begin;
select plan(4);

select has_table(
  'public',
  'login_attempts',
  'login_attempts table exists'
);
select ok(
  (
    select relrowsecurity from pg_class
    where oid = 'public.login_attempts'::regclass
  ),
  'login_attempts has RLS enabled'
);
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'login_attempts'
  ),
  'login_attempts defines no client-facing policies: only the service role (Edge Function) touches it'
);
select ok(
  not has_table_privilege('anon', 'public.login_attempts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.login_attempts', 'SELECT'),
  'neither anon nor authenticated can read login_attempts directly'
);

select * from finish();
rollback;
