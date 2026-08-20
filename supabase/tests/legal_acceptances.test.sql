begin;
select plan(12);

select has_table('public', 'legal_acceptances', 'legal_acceptances exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.legal_acceptances'::regclass),
  'legal_acceptances has RLS enabled'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'legal_acceptances'
      and policyname = 'legal_acceptances_select_own'
  ),
  'legal_acceptances restricts select to its own rows'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'legal_acceptances'
      and policyname = 'legal_acceptances_insert_own'
  ),
  'legal_acceptances restricts insert to its own rows'
);
select ok(
  not has_table_privilege('anon', 'public.legal_acceptances', 'SELECT'),
  'anonymous users cannot read legal acceptances'
);
select ok(
  has_table_privilege('authenticated', 'public.legal_acceptances', 'SELECT'),
  'authenticated users can read their own acceptance evidence through RLS'
);
select ok(
  has_table_privilege('authenticated', 'public.legal_acceptances', 'INSERT'),
  'authenticated users can record their own acceptance'
);
select ok(
  not has_table_privilege('authenticated', 'public.legal_acceptances', 'DELETE'),
  'not even the owner can delete acceptance evidence directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.legal_acceptances', 'UPDATE'),
  'not even the owner can update acceptance evidence directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.legal_acceptances', 'TRUNCATE'),
  'authenticated users cannot truncate legal_acceptances'
);
select ok(
  not has_table_privilege('authenticated', 'public.legal_acceptances', 'REFERENCES'),
  'authenticated users cannot create references to legal_acceptances'
);
select ok(
  not has_table_privilege('authenticated', 'public.legal_acceptances', 'TRIGGER'),
  'authenticated users cannot create triggers on legal_acceptances'
);

select * from finish();
rollback;
