-- 25_profile_avatar_storage.sql
-- Habilita que la foto de perfil viaje al servidor y la vea quien comparte espacio.
--
-- Hasta ahora la foto no salía del dispositivo: `avatarImageService` la recorta y
-- comprime en local y ahí se acaba el recorrido. La columna `profiles.avatar_url`
-- existía desde la migración 01 pero nunca se escribió ni se leyó, y no había
-- ningún bucket de Storage. La consecuencia visible es que la segunda foto del
-- selector de espacio siempre cae al icono de respaldo.

-- 1. Columnas de perfil
--
-- `avatar_url` se renombra en vez de añadir una columna nueva al lado: guarda la
-- ruta del objeto (`{user_id}/avatar.jpg`), no una url, y dejar el nombre viejo
-- invitaría a construir urls a mano en el cliente. El renombrado no destruye
-- nada porque la columna está vacía en todas las filas.
--
-- `avatar_updated_at` es lo que permite invalidar la caché del otro dispositivo:
-- la ruta es fija, así que sin un sello no habría forma de saber que la foto
-- cambió. No se reutiliza `profiles.updated_at` porque también se mueve al
-- editar el nombre, y provocaría redescargas de una foto idéntica.

alter table public.profiles rename column avatar_url to avatar_path;
alter table public.profiles add column avatar_updated_at timestamptz;

-- 2. Bucket privado
--
-- El límite de 256 KiB es un cinturón de seguridad del servidor, no la vía
-- normal: la miniatura de 320x320 que sube el cliente pesa entre 25 y 40 KB. Un
-- cliente con un bug de compresión no puede llenar el bucket ni colar un
-- original de varios MB. El MIME se restringe por el mismo motivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 262144, array['image/jpeg'])
on conflict (id) do nothing;

-- 3. Permisos sobre los objetos
--
-- La ruta canónica es `{user_id}/avatar.jpg`, de modo que la primera carpeta del
-- nombre identifica a su dueño y sirve de criterio para ambas políticas.

create policy avatars_write_own on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- La lectura se apoya en `shares_active_space_with` (migración 24), así que la
-- foto sigue exactamente la misma regla que el nombre: la ve quien comparta un
-- espacio con membresía activa, y una invitación sin aceptar no da acceso.
--
-- El `exists` compara `p.id::text` contra el texto de la carpeta en lugar de
-- castear la carpeta a uuid. Un objeto con una ruta inesperada —subido a mano,
-- o heredado de otra convención— haría fallar el cast y con él la consulta
-- entera; así simplemente no casa con ninguna fila y se deniega.

create policy avatars_select_space_member on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1
        from public.profiles p
       where p.id::text = (storage.foldername(name))[1]
         and public.shares_active_space_with(p.id)
    )
  );

-- 4. Baja de cuenta
--
-- Se reemplaza `request_account_deletion` (versión vigente en la migración 21)
-- únicamente para borrar los objetos del bucket: sin esto la foto sobreviviría a
-- la cuenta. El resto del cuerpo es idéntico.

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_email text;
  solo_space_id uuid;
  deleted_space_count integer := 0;
  left_space_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  -- Espacios sin nadie más a quien preservarle datos. Dos casos:
  --   (a) el usuario sigue activo y no queda ninguna otra persona activa
  --       (espacio personal, o compartido que la pareja ya abandonó);
  --   (b) el usuario ya no está activo y no existe ninguna otra membresía
  --       en absoluto (reintento tras un fallo previo).
  -- Un espacio juntos disuelto conserva la membresía 'removed' de la
  -- pareja, así que cae fuera de (b) y no se borra: sus movimientos siguen
  -- siendo también de la otra persona y solo pierden la autoría.
  for solo_space_id in
    select sm.space_id
      from public.space_members sm
     where sm.user_id = current_user_id
       and (
         (
           sm.status = 'active'
           and not exists (
             select 1 from public.space_members other
              where other.space_id = sm.space_id
                and other.user_id <> current_user_id
                and other.status = 'active'
           )
         )
         or not exists (
           select 1 from public.space_members other
            where other.space_id = sm.space_id
              and other.user_id <> current_user_id
         )
       )
  loop
    delete from public.import_items where space_id = solo_space_id;
    delete from public.import_batches where space_id = solo_space_id;
    delete from public.user_merchant_rules where space_id = solo_space_id;
    delete from public.transactions where space_id = solo_space_id;
    delete from public.recurring_transaction_series where space_id = solo_space_id;
    delete from public.categories where space_id = solo_space_id;
    delete from public.space_members where space_id = solo_space_id;
    delete from public.spaces where id = solo_space_id;
    deleted_space_count := deleted_space_count + 1;
  end loop;

  -- Espacios compartidos donde queda otra persona: el usuario deja de ser
  -- miembro; sus movimientos, categorías, presupuestos y reglas de aviso se
  -- conservan y quedarán sin autor (`created_by = null`) en cuanto se borre
  -- su cuenta.
  update public.space_members
     set status = 'removed', left_at = now(), updated_at = now()
   where user_id = current_user_id
     and status = 'active';
  get diagnostics left_space_count = row_count;

  -- El histórico de intentos de acceso se indexa por email, no por id, así
  -- que ninguna FK lo arrastra al borrar la cuenta.
  select email into current_user_email from auth.users where id = current_user_id;
  if current_user_email is not null then
    delete from public.login_attempts where email = lower(btrim(current_user_email));
  end if;

  -- La foto de perfil vive en Storage, fuera del alcance de cualquier clave
  -- ajena: si no se borra aquí, sobrevive a la cuenta.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = current_user_id::text;

  return jsonb_build_object(
    'deletedSpaceCount', deleted_space_count,
    'leftSpaceCount', left_space_count
  );
end;
$$;
