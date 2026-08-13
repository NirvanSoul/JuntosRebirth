begin;
select plan(7);

select has_column(
  'public', 'space_members', 'space_type',
  'space_members tracks the type of space a membership belongs to'
);
select col_not_null(
  'public', 'space_members', 'space_type',
  'space_type is required on every membership'
);
select has_index(
  'public', 'space_members', 'space_members_one_active_couple_per_user_idx',
  'at most one active couple-space membership per user is enforced at the database level'
);

-- Regression guards for the two documented, previously-live bugs: assert
-- the fixed policy expressions no longer contain the broken condition,
-- rather than trying to simulate two authenticated sessions in pgTAP.
select ok(
  (
    select qual not like '%created_by%' and with_check not like '%created_by%'
    from pg_policies
    where schemaname = 'public' and tablename = 'spaces' and policyname = 'spaces_update_owner'
  ),
  'spaces_update_owner no longer depends on created_by, which can become NULL after account deletion'
);
select ok(
  (
    select qual like '%owner%' and qual not like '%created_by%'
    from pg_policies
    where schemaname = 'public' and tablename = 'spaces' and policyname = 'spaces_update_owner'
  ),
  'spaces_update_owner is based on an active owner membership instead'
);
select ok(
  (
    select qual like '%couple%'
    from pg_policies
    where schemaname = 'public' and tablename = 'space_members' and policyname = 'members_update_self_owner'
  ),
  'members_update_self_owner excludes couple spaces from direct self-service status edits'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'space_members_space_type_check'
  ),
  'space_type is constrained to the same enum as spaces.type'
);

select * from finish();
rollback;
