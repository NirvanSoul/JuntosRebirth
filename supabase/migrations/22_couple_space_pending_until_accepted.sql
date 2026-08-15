-- Un espacio juntos de una sola persona no es un espacio: es una invitación
-- a medias. Hasta ahora `create_couple_space()` lo dejaba plenamente operativo
-- desde el primer segundo, así que quien invitaba podía registrar movimientos
-- "compartidos" que nadie más veía, y el cupo de "un espacio juntos activo por
-- usuario" quedaba consumido por una invitación que quizá nunca se aceptaba.
--
-- `spaces.activated_at` marca ese momento: null = pendiente de que la otra
-- persona acepte, con fecha = espacio real. La columna se añade con default
-- `now()`, así que todo espacio existente y todo espacio personal/otro que
-- creen `ensure_personal_space()` o `migrate_guest_data()` nace activado sin
-- tocar esas funciones. Solo `create_couple_space()` inserta null a propósito.
--
-- No se usa un `status` nuevo ni una tabla aparte porque la señal es
-- exactamente del mismo tipo que `archived_at` (una marca temporal sobre el
-- ciclo de vida del espacio, Bible/DATABASE.md §17) y las políticas RLS ya
-- existentes siguen aplicando sin cambios: quien invita es miembro activo del
-- espacio pendiente y puede leerlo, que es justo lo que necesita la pantalla
-- de espera.
begin;

alter table public.spaces add column activated_at timestamptz default now();

comment on column public.spaces.activated_at is
  'Momento en que el espacio pasó a ser real. Null solo en espacios juntos cuya invitación sigue pendiente de aceptación.';

-- Los espacios juntos que ya existen y nunca llegaron a tener dos personas
-- pasan a pendientes. Se exige que no haya ninguna invitación aceptada en su
-- historial: un espacio donde la pareja sí entró y después se dio de baja
-- (`request_account_deletion` deja su membresía en 'removed' sin archivar el
-- espacio) es un espacio real con historia compartida, no una invitación a
-- medias, y debe seguir activado.
update public.spaces s
   set activated_at = null
 where s.type = 'couple'
   and s.archived_at is null
   and not exists (
     select 1 from public.space_invitations i
      where i.space_id = s.id and i.status = 'accepted'
   )
   and (
     select count(*) from public.space_members m
      where m.space_id = s.id and m.status = 'active'
   ) < 2;

-- 1. Crear espacio juntos: nace pendiente -----------------------------------

create or replace function public.create_couple_space(
  p_name text default 'Juntos',
  p_currency text default 'EUR'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_space_id uuid;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  if exists (
    select 1 from public.space_members
     where user_id = current_user_id and status = 'active' and space_type = 'couple'
  ) then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end if;

  -- `activated_at = null`: el espacio no existe de verdad hasta que la otra
  -- persona acepta la invitación. Quien invita es miembro activo igualmente,
  -- para poder leerlo y gestionarlo mientras espera.
  insert into public.spaces(name, type, currency, created_by, activated_at)
  values (p_name, 'couple', p_currency, current_user_id, null)
  returning id into new_space_id;

  begin
    insert into public.space_members(space_id, user_id, role, status, space_type)
    values (new_space_id, current_user_id, 'owner', 'active', 'couple');
  exception when unique_violation then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end;

  return new_space_id;
end;
$$;

-- 2. Aceptar por enlace: la aceptación es lo que activa el espacio ----------

create or replace function public.accept_space_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_email text;
  invitation record;
  active_member_count integer;
  target_space record;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  select * into invitation
    from public.space_invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
   for update;

  if invitation.id is null then
    raise exception 'invitation_not_found: invitación no encontrada';
  end if;

  -- Idempotente: aceptar dos veces la misma invitación con la misma
  -- cuenta devuelve el mismo resultado sin volver a insertar nada.
  if invitation.status = 'accepted' and invitation.accepted_by = current_user_id then
    select spaces.id, spaces.name into target_space from public.spaces where spaces.id = invitation.space_id;
    return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
  end if;

  if invitation.status = 'accepted' then
    raise exception 'invitation_already_used: esta invitación ya fue aceptada';
  end if;

  if invitation.status = 'revoked' then
    raise exception 'invitation_revoked: esta invitación fue revocada';
  end if;

  if invitation.expires_at < now() then
    raise exception 'invitation_expired: esta invitación caducó';
  end if;

  -- Si la invitación se generó para un correo concreto, solo esa cuenta
  -- puede aceptarla: evita que un enlace reenviado por correo lo use
  -- cualquiera que lo intercepte.
  if invitation.invitee_email is not null then
    select lower(users.email) into current_user_email from auth.users users where users.id = current_user_id;
    if current_user_email is distinct from invitation.invitee_email then
      raise exception 'invitation_wrong_email: esta invitación es para otra dirección de correo';
    end if;
  end if;

  select spaces.id, spaces.type, spaces.archived_at, spaces.name into target_space
    from public.spaces where spaces.id = invitation.space_id;
  if target_space.id is null or target_space.type <> 'couple' or target_space.archived_at is not null then
    raise exception 'invalid_space: el espacio ya no admite invitaciones';
  end if;

  select count(*) into active_member_count
    from public.space_members
   where space_id = target_space.id and status = 'active';
  if active_member_count >= 2 then
    raise exception 'space_full: este espacio ya tiene dos anfitriones';
  end if;

  if exists (
    select 1 from public.space_members
     where user_id = current_user_id and status = 'active' and space_type = 'couple'
  ) then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end if;

  begin
    insert into public.space_members(space_id, user_id, role, status, space_type)
    values (target_space.id, current_user_id, 'owner', 'active', 'couple');
  exception when unique_violation then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end;

  update public.space_invitations
     set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
   where id = invitation.id;

  -- El espacio pasa a ser real justo aquí. `coalesce` para no reescribir la
  -- fecha si ya estaba activado (segunda invitación tras una baja).
  update public.spaces
     set activated_at = coalesce(activated_at, now()), updated_at = now()
   where id = target_space.id;

  return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
end;
$$;

-- 3. Aceptar desde el aviso en la app: mismo activado -----------------------

create or replace function public.accept_current_user_space_invitation(p_invitation_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid()); current_email text; invitation record; target_space record; active_member_count integer;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  select lower(email) into current_email from auth.users where id = current_user_id;
  select * into invitation from public.space_invitations where id = p_invitation_id for update;
  if invitation.id is null then raise exception 'invitation_not_found: invitación no encontrada'; end if;
  if invitation.status = 'accepted' and invitation.accepted_by = current_user_id then
    select id, name into target_space from public.spaces where id = invitation.space_id;
    return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
  end if;
  if invitation.status = 'accepted' then raise exception 'invitation_already_used: esta invitación ya fue aceptada'; end if;
  if invitation.status = 'revoked' then raise exception 'invitation_revoked: esta invitación fue revocada'; end if;
  if invitation.expires_at < now() then raise exception 'invitation_expired: esta invitación caducó'; end if;
  if invitation.invitee_email is distinct from current_email then raise exception 'invitation_wrong_email: esta invitación es para otra dirección de correo'; end if;
  select id, type, archived_at, name into target_space from public.spaces where id = invitation.space_id;
  if target_space.id is null or target_space.type <> 'couple' or target_space.archived_at is not null then raise exception 'invalid_space: el espacio ya no admite invitaciones'; end if;
  select count(*) into active_member_count from public.space_members where space_id = target_space.id and status = 'active';
  if active_member_count >= 2 then raise exception 'space_full: este espacio ya tiene dos anfitriones'; end if;
  if exists (select 1 from public.space_members where user_id = current_user_id and status = 'active' and space_type = 'couple') then raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo'; end if;
  begin
    insert into public.space_members(space_id, user_id, role, status, space_type) values (target_space.id, current_user_id, 'owner', 'active', 'couple');
  exception when unique_violation then raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo'; end;
  update public.space_invitations set status = 'accepted', accepted_by = current_user_id, accepted_at = now() where id = invitation.id;
  update public.spaces set activated_at = coalesce(activated_at, now()), updated_at = now() where id = target_space.id;
  return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
end;
$$;

-- 4. Cancelar: un espacio pendiente se borra, no se archiva -----------------

create or replace function public.dissolve_couple_space(p_space_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  removed_count integer;
  space_activated_at timestamptz;
  space_exists boolean;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  if not exists (
    select 1 from public.space_members
     where space_members.space_id = p_space_id
       and space_members.user_id = current_user_id
       and space_members.role = 'owner'
       and space_members.status = 'active'
  ) then
    raise exception 'not_space_owner: solo un anfitrión del espacio puede eliminarlo';
  end if;

  select true, spaces.activated_at into space_exists, space_activated_at
    from public.spaces where spaces.id = p_space_id and spaces.type = 'couple';
  if space_exists is not true then
    raise exception 'invalid_space: solo se pueden eliminar espacios juntos';
  end if;

  -- Espacio pendiente: nadie más llegó a entrar, así que no hay historia
  -- compartida que preservar. Se borra entero en vez de archivarlo, para no
  -- dejar otro espacio huérfano invisible (ADR-077) y liberar limpiamente el
  -- cupo de un espacio juntos por usuario. El orden de borrado es el mismo
  -- que usa `request_account_deletion` para un espacio en solitario.
  if space_activated_at is null then
    delete from public.import_items where space_id = p_space_id;
    delete from public.import_batches where space_id = p_space_id;
    delete from public.user_merchant_rules where space_id = p_space_id;
    delete from public.transactions where space_id = p_space_id;
    delete from public.recurring_transaction_series where space_id = p_space_id;
    delete from public.categories where space_id = p_space_id;
    delete from public.space_members where space_id = p_space_id;
    get diagnostics removed_count = row_count;
    -- Las invitaciones caen por `on delete cascade` con el espacio.
    delete from public.spaces where id = p_space_id;

    return jsonb_build_object(
      'spaceId', p_space_id,
      'removedMemberCount', removed_count,
      'discarded', true
    );
  end if;

  -- Se archiva, no se borra: los movimientos y categorías compartidos se
  -- conservan (Bible/PRODUCT.md §15, Bible/DATABASE.md §17). Ambas
  -- membresías activas quedan 'removed'; la señal de que fue una
  -- disolución (y no una salida individual como en
  -- request_account_deletion) vive en spaces.archived_at, no en un nuevo
  -- valor de status.
  update public.spaces
     set archived_at = now(), updated_at = now()
   where id = p_space_id and archived_at is null;

  update public.space_members
     set status = 'removed', left_at = now(), updated_at = now()
   where space_id = p_space_id and status = 'active';
  get diagnostics removed_count = row_count;

  return jsonb_build_object(
    'spaceId', p_space_id,
    'removedMemberCount', removed_count,
    'discarded', false
  );
end;
$$;

commit;
