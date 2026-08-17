begin;
set local role postgres;
select plan(13);

-- 1. Columnas de perfil

select has_column(
  'public', 'profiles', 'avatar_path',
  'profiles.avatar_path guarda la ruta del objeto en Storage'
);

select has_column(
  'public', 'profiles', 'avatar_updated_at',
  'profiles.avatar_updated_at permite invalidar la cache del otro dispositivo'
);

select hasnt_column(
  'public', 'profiles', 'avatar_url',
  'avatar_url ya no existe: se renombro, no se duplico'
);

-- 2. Bucket

select ok(
  exists (select 1 from storage.buckets where id = 'avatars'),
  'el bucket avatars existe'
);

select is(
  (select public from storage.buckets where id = 'avatars'),
  false,
  'el bucket avatars es privado: la foto no es accesible por url suelta'
);

select is(
  (select file_size_limit from storage.buckets where id = 'avatars'),
  262144::bigint,
  'el bucket corta a 256 KiB, muy por encima de los 25-40 KB de la miniatura'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'avatars'),
  array['image/jpeg'],
  'el bucket solo acepta JPEG'
);

-- 3. Politicas

select ok(
  exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'avatars_write_own'
  ),
  'existe la politica de escritura del dueno'
);

select ok(
  exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'avatars_select_space_member'
  ),
  'existe la politica de lectura entre miembros del espacio'
);

select ok(
  (
    select qual like '%shares_active_space_with%'
      from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'avatars_select_space_member'
  ),
  'la lectura reutiliza shares_active_space_with: la foto sigue la misma regla que el nombre'
);

-- 4. Baja de cuenta

select ok(
  (
    select prosrc like '%bucket_id = ''avatars''%'
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'request_account_deletion'
  ),
  'request_account_deletion borra la foto del bucket: Storage no lo arrastra ninguna FK'
);

-- 5. Comportamiento real de RLS
--
-- Se insertan dos objetos como postgres (que salta RLS) y despues se consulta
-- como `authenticated` con el jwt de Ana, que es lo que hace la app.

create temporary table avatar_visibility (label text primary key, visible bigint);

do $$
declare
  user_ana uuid := '44444444-4444-4444-8444-444444444441'::uuid;
  user_beto uuid := '44444444-4444-4444-8444-444444444442'::uuid;
  user_zoe uuid := '44444444-4444-4444-8444-444444444443'::uuid;
  couple_space uuid := '44444444-4444-4444-8444-4444444444a1'::uuid;
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at)
  values
    (user_ana, 'authenticated', 'authenticated', 'test_avatar_ana@example.com', now(), now()),
    (user_beto, 'authenticated', 'authenticated', 'test_avatar_beto@example.com', now(), now()),
    (user_zoe, 'authenticated', 'authenticated', 'test_avatar_zoe@example.com', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name)
  values (user_ana, 'Ana'), (user_beto, 'Beto'), (user_zoe, 'Zoe')
  on conflict (id) do nothing;

  insert into public.spaces (id, name, type, currency, created_by)
  values (couple_space, 'Juntos', 'couple', 'EUR', user_ana)
  on conflict (id) do nothing;

  insert into public.space_members (space_id, user_id, role, status, space_type)
  values
    (couple_space, user_ana, 'owner', 'active', 'couple'),
    (couple_space, user_beto, 'member', 'active', 'couple')
  on conflict (space_id, user_id) do nothing;

  -- Zoe no comparte espacio con nadie: es el caso denegado.
  insert into storage.objects (bucket_id, name, owner)
  values
    ('avatars', user_beto::text || '/avatar.jpg', user_beto),
    ('avatars', user_zoe::text || '/avatar.jpg', user_zoe)
  on conflict do nothing;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444441', true);

insert into avatar_visibility
select 'ana_ve_beto', count(*)
  from storage.objects
 where bucket_id = 'avatars'
   and name = '44444444-4444-4444-8444-444444444442/avatar.jpg';

insert into avatar_visibility
select 'ana_ve_zoe', count(*)
  from storage.objects
 where bucket_id = 'avatars'
   and name = '44444444-4444-4444-8444-444444444443/avatar.jpg';

set local role postgres;

select is(
  (select visible from avatar_visibility where label = 'ana_ve_beto'),
  1::bigint,
  'Ana ve la foto de Beto, con quien comparte un espacio activo'
);

select is(
  (select visible from avatar_visibility where label = 'ana_ve_zoe'),
  0::bigint,
  'Ana no ve la foto de Zoe, con quien no comparte ningun espacio'
);

select * from finish();
rollback;
