begin;
select plan(26);

select has_table('public', 'user_merchant_rules', 'personal merchant rules exist');
select has_table('public', 'import_batches', 'import batches exist');
select has_table('public', 'import_items', 'import items exist');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_merchant_rules'::regclass),
  'merchant rules have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.import_batches'::regclass),
  'import batches have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.import_items'::regclass),
  'import items have RLS enabled'
);

select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'user_merchant_rules'
    and policyname = 'user_merchant_rules_update_own'
), 'merchant rule updates are scoped to their owner');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'import_batches'
    and policyname = 'import_batches_select_own'
), 'batches are visible only to their owner');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'import_items'
    and policyname = 'import_items_update_own_batch'
), 'items inherit their batch ownership');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.user_merchant_rules'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like '%(user_id, space_id, normalized_merchant)%'
), 'one active merchant rule per user, space and merchant');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.import_items'::regclass
    and contype = 'f'
    and pg_get_constraintdef(oid) like '%(final_category_id, space_id)%'
), 'item categories must belong to the batch space');
select ok(
  not has_table_privilege('anon', 'public.import_batches', 'SELECT'),
  'anonymous users cannot read import batches'
);
select has_function(
  'public',
  'sync_import_merchant_rules',
  array['text', 'jsonb'],
  'merchant rule sync RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.sync_import_merchant_rules(text,jsonb)',
    'EXECUTE'
  ),
  'authenticated users can sync their mapped merchant rules'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.sync_import_merchant_rules(text,jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot sync merchant rules'
);
select has_function(
  'public',
  'sync_import_batches',
  array['text', 'jsonb', 'jsonb'],
  'import batch sync RPC exists'
);
select ok(exists (
  select 1
    from pg_attribute
    join pg_class on pg_class.oid = pg_attribute.attrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'public' and relname = 'import_items'
     and attname = 'is_selected'
     and attnum > 0 and not attisdropped
), 'items preserve their local review selection');
select ok(
  has_function_privilege(
    'authenticated',
    'public.sync_import_batches(text,jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated users can sync their import review'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.sync_import_batches(text,jsonb,jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot sync import reviews'
);
select has_table('public', 'merchant_feedback_votes', 'private feedback votes exist');
select has_table('public', 'merchant_feedback_aggregates', 'feedback aggregates exist');
select has_table('public', 'global_rule_candidates', 'manual-review candidates exist');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.merchant_feedback_votes'::regclass),
  'community votes have RLS enabled'
);
select ok(
  not has_table_privilege('authenticated', 'public.merchant_feedback_aggregates', 'UPDATE'),
  'clients cannot mutate community aggregates directly'
);
select has_function(
  'public',
  'record_merchant_feedback',
  array['uuid', 'text'],
  'community feedback RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.record_merchant_feedback(uuid,text)', 'EXECUTE'
  ),
  'authenticated users can record feedback through the protected RPC'
);

select * from finish();
rollback;
