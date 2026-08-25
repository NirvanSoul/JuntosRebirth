begin;
select plan(18);

select has_table(
  'public', 'user_push_tokens',
  'push tokens have a dedicated table'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_push_tokens'::regclass),
  'push tokens have RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'user_push_tokens'),
  0,
  'no client-facing RLS policy exposes push tokens'
);
select ok(
  not has_table_privilege('anon', 'public.user_push_tokens', 'SELECT'),
  'anonymous sessions cannot read push tokens'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_push_tokens', 'SELECT'),
  'authenticated sessions cannot read push tokens'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_push_tokens', 'INSERT'),
  'authenticated sessions cannot insert tokens directly'
);
select ok(
  has_table_privilege('service_role', 'public.user_push_tokens', 'SELECT'),
  'the push sender can resolve registered devices'
);
select has_function(
  'public', 'register_current_user_push_token', array['text', 'text'],
  'authenticated users can register through a controlled RPC'
);
select has_function(
  'public', 'unregister_current_user_push_token', array['text'],
  'authenticated users can unregister through a controlled RPC'
);
select has_function(
  'public', 'claim_space_invitation_push', array['uuid'],
  'the push sender can claim an invitation once'
);
select ok(
  has_function_privilege('authenticated', 'public.register_current_user_push_token(text,text)', 'EXECUTE'),
  'authenticated sessions can execute token registration'
);
select ok(
  has_function_privilege('authenticated', 'public.unregister_current_user_push_token(text)', 'EXECUTE'),
  'authenticated sessions can execute token removal'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_space_invitation_push(uuid)', 'EXECUTE'),
  'clients cannot resolve the recipient of an invitation'
);
select ok(
  has_function_privilege('service_role', 'public.claim_space_invitation_push(uuid)', 'EXECUTE'),
  'only the backend sender can claim a push'
);
select has_column(
  'public', 'space_invitations', 'push_notification_attempted_at',
  'invitations record a single push attempt'
);
select has_function(
  'public', 'revoke_previous_space_invitation', array[]::text[],
  'changing the target revokes the previous pending invitation'
);
select has_trigger(
  'public', 'space_invitations',
  'space_invitations_revoke_previous_before_insert',
  'every new invitation enforces a single pending partner'
);
select fk_ok(
  'public', 'user_push_tokens', 'user_id',
  'auth', 'users', 'id',
  'push token ownership references auth users'
);

select * from finish();
rollback;
