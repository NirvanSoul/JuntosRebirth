begin;
set local role postgres;
select plan(10);

-- 1. Forma y permisos de la función

select has_function(
  'public',
  'shares_active_space_with',
  array['uuid'],
  'shares_active_space_with existe con la firma esperada'
);

select is(
  (
    select prosecdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'shares_active_space_with'
  ),
  true,
  'shares_active_space_with es SECURITY DEFINER, que es lo que corta la recursión de RLS sobre space_members'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.shares_active_space_with(uuid)', 'EXECUTE'
  ),
  'un usuario autenticado puede ejecutar shares_active_space_with'
);

select ok(
  not has_function_privilege(
    'anon', 'public.shares_active_space_with(uuid)', 'EXECUTE'
  ),
  'anon no puede ejecutar shares_active_space_with'
);

-- 2. Políticas sobre profiles

select ok(
  exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'profiles'
       and policyname = 'profiles_select_space_member'
  ),
  'la política de lectura entre miembros de un espacio existe'
);

select ok(
  exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'profiles'
       and policyname = 'profiles_select_own'
  ),
  'la política de lectura del perfil propio sigue viva: las dos se combinan con OR'
);

-- 3. Comportamiento con usuarios sintéticos aislados
--
-- Ana y Beto comparten un espacio juntos con ambas membresías activas. Carla
-- tiene una membresía pendiente en ese mismo espacio: sirve de caso denegado
-- sin necesidad de un cuarto espacio.

create temporary table shares_results (label text primary key, result boolean);

do $$
declare
  user_ana uuid := '33333333-3333-4333-8333-333333333331'::uuid;
  user_beto uuid := '33333333-3333-4333-8333-333333333332'::uuid;
  user_carla uuid := '33333333-3333-4333-8333-333333333333'::uuid;
  couple_space uuid := '33333333-3333-4333-8333-3333333333a1'::uuid;
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at)
  values
    (user_ana, 'authenticated', 'authenticated', 'test_profiles_ana@example.com', now(), now()),
    (user_beto, 'authenticated', 'authenticated', 'test_profiles_beto@example.com', now(), now()),
    (user_carla, 'authenticated', 'authenticated', 'test_profiles_carla@example.com', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name)
  values (user_ana, 'Ana'), (user_beto, 'Beto'), (user_carla, 'Carla')
  on conflict (id) do nothing;

  insert into public.spaces (id, name, type, currency, created_by)
  values (couple_space, 'Juntos', 'couple', 'EUR', user_ana)
  on conflict (id) do nothing;

  insert into public.space_members (space_id, user_id, role, status, space_type)
  values
    (couple_space, user_ana, 'owner', 'active', 'couple'),
    (couple_space, user_beto, 'member', 'active', 'couple'),
    (couple_space, user_carla, 'member', 'pending', 'couple')
  on conflict (space_id, user_id) do nothing;

  perform set_config('request.jwt.claim.sub', user_ana::text, true);
  insert into shares_results values
    ('ana_ve_beto', public.shares_active_space_with(user_beto)),
    ('ana_ve_carla', public.shares_active_space_with(user_carla)),
    ('ana_se_ve', public.shares_active_space_with(user_ana));

  perform set_config('request.jwt.claim.sub', user_beto::text, true);
  insert into shares_results values
    ('beto_ve_ana', public.shares_active_space_with(user_ana));
end $$;

select is(
  (select result from shares_results where label = 'ana_ve_beto'),
  true,
  'Ana puede leer el perfil de Beto: comparten un espacio con ambas membresías activas'
);

select is(
  (select result from shares_results where label = 'beto_ve_ana'),
  true,
  'la visibilidad es simétrica: Beto también puede leer el perfil de Ana'
);

select is(
  (select result from shares_results where label = 'ana_ve_carla'),
  false,
  'una membresía pendiente no abre el perfil: Ana no puede leer el de Carla hasta que acepte'
);

select is(
  (select result from shares_results where label = 'ana_se_ve'),
  true,
  'el perfil propio sigue siendo legible a través de la membresía activa'
);

select * from finish();
rollback;
