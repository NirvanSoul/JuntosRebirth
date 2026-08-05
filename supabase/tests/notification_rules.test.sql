begin;
select plan(6);

select has_table(
  'public',
  'transaction_notification_rules',
  'transaction_notification_rules exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.transaction_notification_rules'::regclass),
  'transaction_notification_rules has RLS enabled'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'transaction_notification_rules'
      and policyname = 'notification_rules_select_member'
  ),
  'notification rules are readable by active space members'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'transaction_notification_rules'
      and policyname = 'notification_rules_update_member'
  ),
  'notification rules can be updated by any active space member, not only their author'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaction_notification_rules'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(space_id, transaction_type)%'
  ),
  'a space has at most one rule per transaction type'
);
select ok(
  not has_table_privilege('anon', 'public.transaction_notification_rules', 'SELECT'),
  'anonymous users cannot read notification rules'
);

select * from finish();
rollback;
