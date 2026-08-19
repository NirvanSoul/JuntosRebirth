begin;
select plan(32);

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
select has_function('public', 'create_space_invitation', array['uuid', 'text'], 'create_space_invitation exists');
select has_function('public', 'get_space_invitation_preview', array['text'], 'get_space_invitation_preview exists');
select has_function('public', 'accept_space_invitation', array['text'], 'accept_space_invitation exists');
select has_function('public', 'dissolve_couple_space', array['uuid'], 'dissolve_couple_space exists');
select has_function('public', 'ensure_personal_space', array['text', 'text'], 'ensure_personal_space exists');

select ok(
  not has_function_privilege('anon', 'public.create_couple_space(text,text)', 'EXECUTE'),
  'anonymous users cannot create a couple space'
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
  has_function_privilege('authenticated', 'public.create_couple_space(text,text)', 'EXECUTE'),
  'authenticated users can create a couple space'
);
select ok(
  not has_function_privilege('anon', 'public.create_space_invitation(uuid,text)', 'EXECUTE'),
  'anonymous users cannot create a space invitation'
);
select ok(
  has_function_privilege('authenticated', 'public.create_space_invitation(uuid,text)', 'EXECUTE'),
  'authenticated users can create a space invitation'
);
select ok(
  not has_function_privilege('anon', 'public.dissolve_couple_space(uuid)', 'EXECUTE'),
  'anonymous users cannot dissolve a couple space'
);
select ok(
  has_function_privilege('authenticated', 'public.dissolve_couple_space(uuid)', 'EXECUTE'),
  'authenticated users can dissolve a couple space they own'
);
select ok(
  not has_function_privilege('anon', 'public.ensure_personal_space(text,text)', 'EXECUTE'),
  'anonymous users cannot ensure a personal space'
);
select ok(
  has_function_privilege('authenticated', 'public.ensure_personal_space(text,text)', 'EXECUTE'),
  'authenticated users can ensure a personal space'
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
