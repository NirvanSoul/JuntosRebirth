begin;
select plan(35);

select has_table('public', 'space_invitations', 'space_invitations exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.space_invitations'::regclass),
  'space_invitations has RLS enabled'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'space_invitations'
      and policyname = 'space_invitations_select_member'
  ),
  'space_invitations restricts select to active space members or the inviter'
);
select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'space_invitations') = 1,
  'space_invitations has no policy besides select: every mutation must go through a controlled function'
);
select ok(
  not has_table_privilege('anon', 'public.space_invitations', 'SELECT'),
  'anonymous users cannot read space_invitations directly'
);
select ok(
  has_table_privilege('authenticated', 'public.space_invitations', 'SELECT'),
  'authenticated users can read their own space_invitations rows via RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.space_invitations', 'INSERT'),
  'authenticated users cannot insert invitations directly, only via create_space_invitation'
);
select ok(
  not has_table_privilege('authenticated', 'public.space_invitations', 'UPDATE'),
  'authenticated users cannot update invitations directly, only via accept_space_invitation'
);
select ok(
  not has_table_privilege('authenticated', 'public.space_invitations', 'DELETE'),
  'invitations cannot be deleted directly, only revoked via create_space_invitation replacing them'
);
select has_index(
  'public', 'space_invitations', 'space_invitations_one_pending_per_target_idx',
  'at most one pending invitation per target is enforced at the database level'
);

select has_function('public', 'create_couple_space', array['text', 'text'], 'create_couple_space exists');
select has_function(
  'public',
  'create_couple_space_invitation',
  array['text', 'text', 'text'],
  'atomic couple space invitation creation exists'
);
select has_function('public', 'create_space_invitation', array['uuid', 'text'], 'create_space_invitation exists');
select has_function('public', 'get_space_invitation_preview', array['text'], 'get_space_invitation_preview exists');
select has_function('public', 'accept_space_invitation', array['text'], 'accept_space_invitation exists');
select has_function('public', 'leave_couple_space', array['uuid'], 'leave_couple_space exists');

select ok(
  not has_function_privilege('anon', 'public.create_couple_space(text,text)', 'EXECUTE'),
  'anonymous users cannot create a couple space'
);
select ok(
  not has_function_privilege('anon', 'public.create_couple_space_invitation(text,text,text)', 'EXECUTE'),
  'anonymous users cannot atomically create a couple space invitation'
);
select ok(
  has_function_privilege('authenticated', 'public.create_couple_space_invitation(text,text,text)', 'EXECUTE'),
  'authenticated users can atomically create their couple space invitation'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.create_couple_space_invitation(text,text,text)'::regprocedure)
    ~ E'insert into public\\.spaces(.|\\n)*insert into public\\.space_invitations',
  'the atomic RPC persists the space and invitation in the same database transaction'
);
select ok(
  not has_function_privilege('anon', 'public.accept_space_invitation(text)', 'EXECUTE'),
  'anonymous users cannot accept an invitation without an account'
);
select ok(
  has_function_privilege('anon', 'public.get_space_invitation_preview(text)', 'EXECUTE'),
  'anonymous users can preview an invitation before signing up or logging in'
);
select ok(
  has_function_privilege('authenticated', 'public.accept_space_invitation(text)', 'EXECUTE'),
  'authenticated users can accept an invitation'
);
select ok(
  has_function_privilege('authenticated', 'public.leave_couple_space(uuid)', 'EXECUTE'),
  'authenticated users can leave a couple space they belong to'
);
select ok(
  to_regprocedure('public.dissolve_couple_space(uuid)') is null,
  'the obsolete symmetric dissolution RPC no longer exists'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.leave_couple_space(uuid)'::regprocedure) ~ 'status = ''left''',
  'leaving records an individual departure instead of removing every member'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.leave_couple_space(uuid)'::regprocedure) ~ 'for update',
  'concurrent departures are serialized before deciding whether to delete the space'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.leave_couple_space(uuid)'::regprocedure) ~ 'delete from public.money_accounts',
  'the final departure clears money accounts before deleting the space'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.accept_space_invitation(text)'::regprocedure) ~ 'on conflict \(space_id, user_id\) do update',
  'a link invitation can reactivate a member who previously left'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.accept_current_user_space_invitation(uuid)'::regprocedure) ~ 'on conflict \(space_id, user_id\) do update',
  'an in-app invitation can reactivate a member who previously left'
);

-- Un espacio juntos no existe de verdad hasta que la otra persona acepta
-- (migración 22): `spaces.activated_at` es la señal.
select has_column('public', 'spaces', 'activated_at', 'spaces tracks when it became real');
select ok(
  (
    select is_nullable = 'YES'
      from information_schema.columns
     where table_schema = 'public' and table_name = 'spaces' and column_name = 'activated_at'
  ),
  'activated_at admits null: that is exactly what marks a couple space still awaiting acceptance'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.create_couple_space(text, text)'::regprocedure) ~ 'activated_at\)',
  'create_couple_space inserts the space as pending instead of fully operational'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.accept_space_invitation(text)'::regprocedure) ~ 'activated_at = coalesce\(activated_at, now\(\)\)',
  'accepting a link invitation is what activates the couple space'
);
select ok(
  (select prosrc from pg_proc where oid = 'public.accept_current_user_space_invitation(uuid)'::regprocedure) ~ 'activated_at = coalesce\(activated_at, now\(\)\)',
  'accepting the in-app invitation is what activates the couple space'
);

select * from finish();
rollback;
