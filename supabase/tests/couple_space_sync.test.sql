begin;
select plan(5);

select has_function(
  'public',
  'sync_couple_space_data',
  array['uuid', 'text', 'jsonb', 'jsonb', 'jsonb'],
  'the couple-space financial sync RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.sync_couple_space_data(uuid,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'an authenticated member can invoke the controlled couple-space sync RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.sync_couple_space_data(uuid,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'an anonymous caller cannot invoke the couple-space sync RPC'
);

select ok(
  exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'categories'
  ),
  'category changes are published to Supabase Realtime'
);

select ok(
  exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'transactions'
  ),
  'transaction changes are published to Supabase Realtime'
);

select * from finish();
rollback;
