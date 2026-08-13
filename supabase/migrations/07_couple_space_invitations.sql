-- Añade espacios de pareja reales ("espacios juntos") e invitaciones
-- (Bible/DATABASE.md §6.4, ROADMAP.md Fase 11). Un espacio de pareja se
-- crea mediante create_couple_space() y solo admite un segundo miembro a
-- través de una invitación aceptada con accept_space_invitation(): no
-- existe ninguna política que permita insertar una fila de space_members
-- para otra persona desde el cliente. Al aceptar, ambas personas quedan
-- con role = 'owner' (anfitriones simétricos, sin jerarquía dueño/miembro).
--
-- También corrige dos políticas que hoy son inofensivas pero dejan de
-- serlo en cuanto existen espacios de pareja reales:
--   - spaces_update_owner dependía de created_by, que puede quedar NULL
--     tras borrar la cuenta de quien creó el espacio (ver comentario en
--     202608070002_account_deletion.sql). Pasa a depender de tener una
--     membresía activa con role = 'owner'.
--   - members_update_self_owner permitía a cualquier owner poner su propia
--     fila en status = 'removed' directamente desde el cliente. Para
--     espacios de pareja esto sería un "abandono silencioso" sin pasar por
--     dissolve_couple_space(); se excluye explícitamente ese caso.

-- 1. Invitaciones a espacio de pareja ----------------------------------

create table public.space_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  invitee_email text check (invitee_email is null or invitee_email = lower(btrim(invitee_email))),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Como mucho una invitación pendiente por espacio: create_space_invitation
-- revoca cualquier pendiente anterior antes de insertar, este índice es un
-- respaldo ante llamadas concurrentes, no el mecanismo principal.
create unique index space_invitations_one_pending_per_space_idx
  on public.space_invitations(space_id)
  where status = 'pending';

create index space_invitations_invitee_email_status_idx
  on public.space_invitations(invitee_email, status);
create index space_invitations_space_status_idx
  on public.space_invitations(space_id, status);

alter table public.space_invitations enable row level security;

-- Sin políticas de insert/update/delete: toda mutación pasa por funciones
-- security definer (Bible/DATABASE.md §9.4, "Aceptar invitaciones mediante
-- función controlada"). No se guarda nunca el token en texto plano, solo
-- su hash (token_hash).
create policy space_invitations_select_member on public.space_invitations for select to authenticated
  using (public.is_active_space_member(space_id) or invited_by = (select auth.uid()));

revoke all on public.space_invitations from anon, authenticated;
grant select on public.space_invitations to authenticated;

-- 2. Corrige spaces_update_owner ----------------------------------------

drop policy spaces_update_owner on public.spaces;
create policy spaces_update_owner on public.spaces for update to authenticated
  using (exists (
    select 1 from public.space_members
     where space_members.space_id = spaces.id
       and space_members.user_id = (select auth.uid())
       and space_members.role = 'owner'
       and space_members.status = 'active'
  ))
  with check (exists (
    select 1 from public.space_members
     where space_members.space_id = spaces.id
       and space_members.user_id = (select auth.uid())
       and space_members.role = 'owner'
       and space_members.status = 'active'
  ));

-- 3. Corrige members_update_self_owner -----------------------------------

drop policy members_update_self_owner on public.space_members;
create policy members_update_self_owner on public.space_members for update to authenticated
  using (
    user_id = (select auth.uid()) and role = 'owner'
    and not exists (
      select 1 from public.spaces
       where spaces.id = space_members.space_id and spaces.type = 'couple'
    )
  )
  with check (
    user_id = (select auth.uid()) and role = 'owner'
    and not exists (
      select 1 from public.spaces
       where spaces.id = space_members.space_id and spaces.type = 'couple'
    )
  );

-- 4. Un espacio juntos activo por usuario --------------------------------

-- space_type copia una sola vez el type del espacio al crear la
-- membresía y nunca cambia (el type de un espacio es inmutable tras
-- crearse). Denormalizarlo aquí permite expresar "como mucho un espacio
-- de pareja activo por usuario" como un índice único parcial de esta
-- misma tabla, igual que spaces_one_active_personal_per_user_idx ya
-- resuelve el caso análogo para espacios personales. Una comprobación
-- únicamente a nivel de aplicación (select exists ... antes del insert)
-- dejaría una condición de carrera real entre dos aceptaciones
-- concurrentes; el índice la cierra a nivel de base de datos.
alter table public.space_members add column space_type text;

update public.space_members sm
   set space_type = s.type
  from public.spaces s
 where s.id = sm.space_id;

alter table public.space_members alter column space_type set not null;
alter table public.space_members add constraint space_members_space_type_check
  check (space_type in ('personal', 'couple', 'other'));

create unique index space_members_one_active_couple_per_user_idx
  on public.space_members(user_id)
  where status = 'active' and space_type = 'couple';

-- space_type ahora es not null, así que todo punto que inserte en
-- space_members debe fijarlo. ensure_personal_space no lo hacía porque es
-- anterior a esta columna.
create or replace function public.ensure_personal_space(
  p_name text default 'Personal',
  p_currency text default 'EUR'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  personal_space_id uuid;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  select id into personal_space_id
    from public.spaces
   where created_by = current_user_id and type = 'personal' and archived_at is null;

  if personal_space_id is null then
    insert into public.spaces(name, type, currency, created_by)
    values (p_name, 'personal', p_currency, current_user_id)
    returning id into personal_space_id;
  end if;

  insert into public.space_members(space_id, user_id, role, status, space_type)
  values (personal_space_id, current_user_id, 'owner', 'active', 'personal')
  on conflict (space_id, user_id) do update
    set role = 'owner', status = 'active', space_type = 'personal', left_at = null, updated_at = now();
  return personal_space_id;
end;
$$;

-- 5. Crear espacio de pareja ---------------------------------------------

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

  insert into public.spaces(name, type, currency, created_by)
  values (p_name, 'couple', p_currency, current_user_id)
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

revoke all on function public.create_couple_space(text, text) from anon, authenticated;
grant execute on function public.create_couple_space(text, text) to authenticated;

-- 6. Crear invitación (por correo o solo enlace) --------------------------

create or replace function public.create_space_invitation(
  p_space_id uuid,
  p_invitee_email text default null
)
returns table (id uuid, plaintext_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_email text;
  new_token text;
  new_token_hash text;
  new_invitation_id uuid;
  new_expires_at timestamptz;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  if not exists (
    select 1 from public.space_members
     where space_members.space_id = p_space_id
       and space_members.user_id = current_user_id
       and space_members.role = 'owner'
       and space_members.status = 'active'
  ) then
    raise exception 'not_space_owner: solo un anfitrión del espacio puede invitar';
  end if;

  if not exists (
    select 1 from public.spaces
     where spaces.id = p_space_id and spaces.type = 'couple' and spaces.archived_at is null
  ) then
    raise exception 'invalid_space: el espacio no admite invitaciones';
  end if;

  normalized_email := nullif(lower(btrim(p_invitee_email)), '');

  -- Solo puede existir una invitación pendiente por espacio: la anterior
  -- (si la hay) queda revocada antes de crear la nueva.
  update public.space_invitations
     set status = 'revoked'
   where space_invitations.space_id = p_space_id and status = 'pending';

  new_token := encode(extensions.gen_random_bytes(32), 'hex');
  new_token_hash := encode(extensions.digest(new_token, 'sha256'), 'hex');

  insert into public.space_invitations(space_id, invited_by, invitee_email, token_hash)
  values (p_space_id, current_user_id, normalized_email, new_token_hash)
  returning space_invitations.id, space_invitations.expires_at into new_invitation_id, new_expires_at;

  -- El token en texto plano solo existe aquí y en el correo que lo envía;
  -- nunca se guarda ni se registra.
  return query select new_invitation_id, new_token, new_expires_at;
end;
$$;

revoke all on function public.create_space_invitation(uuid, text) from anon, authenticated;
grant execute on function public.create_space_invitation(uuid, text) to authenticated;

-- 7. Vista previa de invitación (accesible sin sesión) ---------------------

create or replace function public.get_space_invitation_preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation record;
  effective_status text;
  masked_email text;
  space_name text;
  inviter_name text;
begin
  select * into invitation
    from public.space_invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if invitation.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if invitation.status = 'accepted' then
    effective_status := 'accepted';
  elsif invitation.status = 'revoked' then
    effective_status := 'revoked';
  elsif invitation.expires_at < now() then
    effective_status := 'expired';
  else
    effective_status := 'pending';
  end if;

  if effective_status <> 'pending' then
    return jsonb_build_object('status', effective_status);
  end if;

  select spaces.name into space_name from public.spaces where spaces.id = invitation.space_id;
  select profiles.display_name into inviter_name
    from public.profiles where profiles.id = invitation.invited_by;

  if invitation.invitee_email is not null then
    masked_email := left(invitation.invitee_email, 1) || '***@' ||
      split_part(invitation.invitee_email, '@', 2);
  end if;

  -- No se devuelve space_id ni ningún dato de otros miembros: solo lo
  -- necesario para que la pantalla de aceptación muestre contexto antes
  -- de que la persona tenga sesión.
  return jsonb_build_object(
    'status', 'pending',
    'spaceName', space_name,
    'inviterDisplayName', coalesce(inviter_name, 'Alguien'),
    'invitedEmailMasked', masked_email
  );
end;
$$;

revoke all on function public.get_space_invitation_preview(text) from public;
grant execute on function public.get_space_invitation_preview(text) to anon, authenticated;

-- 8. Aceptar invitación ----------------------------------------------------

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

  return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
end;
$$;

revoke all on function public.accept_space_invitation(text) from anon, authenticated;
grant execute on function public.accept_space_invitation(text) to authenticated;

-- 9. Disolver espacio de pareja ---------------------------------------------

create or replace function public.dissolve_couple_space(p_space_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  removed_count integer;
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

  if not exists (
    select 1 from public.spaces where spaces.id = p_space_id and spaces.type = 'couple'
  ) then
    raise exception 'invalid_space: solo se pueden eliminar espacios juntos';
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

  return jsonb_build_object('spaceId', p_space_id, 'removedMemberCount', removed_count);
end;
$$;

revoke all on function public.dissolve_couple_space(uuid) from anon, authenticated;
grant execute on function public.dissolve_couple_space(uuid) to authenticated;

-- 10. migrate_guest_data: degrada 'couple' a 'other' ------------------------

-- Todo dispositivo invitado arranca con un espacio local type='couple'
-- ("Juntos") puramente decorativo, que nadie creó ni compartió de verdad
-- (src/features/spaces/types.ts). Subirlo tal cual consumiría el cupo real
-- de "un espacio juntos activo por usuario" (§4) para cualquiera que se
-- registre, bloqueándolo para siempre de crear o aceptar un espacio de
-- pareja real. Se degrada a 'other' al migrar; los espacios de pareja
-- reales solo se crean mediante create_couple_space/accept_space_invitation.
create or replace function public.migrate_guest_data(
  p_batch_id uuid,
  p_installation_id text,
  p_spaces jsonb,
  p_categories jsonb,
  p_recurring_series jsonb,
  p_transactions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  item record;
  remote_space_id uuid;
  remote_category_id uuid;
  remote_series_id uuid;
  existing_result jsonb;
  existing_batch_user_id uuid;
  normalized_type text;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_installation_id), '') is null then raise exception 'installation required'; end if;
  if jsonb_typeof(p_spaces) <> 'array'
     or jsonb_typeof(p_categories) <> 'array'
     or jsonb_typeof(p_recurring_series) <> 'array'
     or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'migration payload must contain arrays';
  end if;

  select jsonb_build_object(
    'batchId', id,
    'spaceCount', space_count,
    'categoryCount', category_count,
    'seriesCount', series_count,
    'transactionCount', transaction_count
  ) into existing_result
  from public.guest_migration_batches
  where id = p_batch_id and user_id = current_user_id and status = 'completed';
  if existing_result is not null then return existing_result; end if;

  select user_id into existing_batch_user_id
    from public.guest_migration_batches where id = p_batch_id;
  if existing_batch_user_id is not null and existing_batch_user_id <> current_user_id then
    raise exception 'migration batch belongs to another user';
  end if;

  insert into public.guest_migration_batches(id, user_id, installation_id, status)
  values (p_batch_id, current_user_id, p_installation_id, 'processing')
  on conflict (id) do nothing;

  for item in select * from jsonb_to_recordset(p_spaces)
    as x(id text, name text, type text)
  loop
    remote_space_id := null;
    select space_id into remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item.id;
    if remote_space_id is null and item.type = 'personal' then
      select id into remote_space_id from public.spaces
       where created_by = current_user_id and type = 'personal' and archived_at is null;
    end if;

    normalized_type := case when item.type = 'couple' then 'other' else item.type end;

    if remote_space_id is not null then
      update public.spaces set
        name = item.name, updated_at = now()
      where id = remote_space_id;
    else
      insert into public.spaces(
        name, type, currency, created_by
      ) values (
        item.name, normalized_type, 'EUR', current_user_id
      )
      returning id into remote_space_id;
    end if;

    insert into public.space_local_sources(space_id, user_id, installation_id, local_id)
    values (remote_space_id, current_user_id, p_installation_id, item.id)
    on conflict (user_id, installation_id, local_id) do update
      set space_id = excluded.space_id;

    insert into public.space_members(space_id, user_id, role, status, space_type)
    values (remote_space_id, current_user_id, 'owner', 'active', normalized_type)
    on conflict (space_id, user_id) do update
      set role = 'owner', status = 'active', space_type = excluded.space_type,
          left_at = null, updated_at = now();
  end loop;

  for item in select * from jsonb_to_recordset(p_categories) as x(
    id text, "spaceId" text, name text, icon text, "colorToken" text,
    "budgetMinor" bigint, "isDefault" boolean, "templateKey" text,
    "sourceCategoryId" text, "isArchived" boolean, "createdAt" timestamptz,
    "updatedAt" timestamptz, "archivedAt" timestamptz
  ) loop
    select space_id into strict remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item."spaceId";
    insert into public.categories(
      space_id, name, icon, color_token, budget_amount_minor, created_by,
      is_default, template_key, source_installation_id, source_local_id,
      source_local_category_id, is_archived, created_at, updated_at, archived_at
    ) values (
      remote_space_id, item.name, item.icon, item."colorToken", item."budgetMinor",
      current_user_id, item."isDefault", item."templateKey", p_installation_id,
      item.id, item."sourceCategoryId", item."isArchived", item."createdAt",
      item."updatedAt", item."archivedAt"
    ) on conflict (space_id, source_installation_id, source_local_id) do update set
      name = excluded.name, icon = excluded.icon, color_token = excluded.color_token,
      budget_amount_minor = excluded.budget_amount_minor,
      is_default = excluded.is_default, template_key = excluded.template_key,
      source_local_category_id = excluded.source_local_category_id,
      is_archived = excluded.is_archived, updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  end loop;

  for item in select * from jsonb_to_recordset(p_recurring_series) as x(
    id text, "spaceId" text, "categoryId" text, type text, "amountMinor" bigint,
    currency text, title text, frequency text, "startsOn" date,
    "generatedOccurrences" integer, "nextOccurrenceOn" date,
    "isArchived" boolean, "createdAt" timestamptz, "updatedAt" timestamptz,
    "archivedAt" timestamptz
  ) loop
    select space_id into strict remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item."spaceId";
    select id into strict remote_category_id from public.categories
     where space_id = remote_space_id and source_installation_id = p_installation_id
       and source_local_id = item."categoryId";
    insert into public.recurring_transaction_series(
      space_id, category_id, created_by, type, amount_minor, currency, title,
      frequency, starts_on, generated_occurrences, next_occurrence_on,
      source_installation_id, source_local_id, is_archived, created_at,
      updated_at, archived_at
    ) values (
      remote_space_id, remote_category_id, current_user_id, item.type,
      item."amountMinor", item.currency, item.title, item.frequency,
      item."startsOn", item."generatedOccurrences", item."nextOccurrenceOn",
      p_installation_id, item.id, item."isArchived", item."createdAt",
      item."updatedAt", item."archivedAt"
    ) on conflict (space_id, source_installation_id, source_local_id) do update set
      category_id = excluded.category_id, type = excluded.type,
      amount_minor = excluded.amount_minor, currency = excluded.currency,
      title = excluded.title, frequency = excluded.frequency,
      starts_on = excluded.starts_on,
      generated_occurrences = excluded.generated_occurrences,
      next_occurrence_on = excluded.next_occurrence_on,
      is_archived = excluded.is_archived, updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  end loop;

  for item in select * from jsonb_to_recordset(p_transactions) as x(
    id text, "spaceId" text, "categoryId" text, type text, "amountMinor" bigint,
    currency text, title text, "occurredOn" date, recurrence text,
    "recurrenceGroupId" text, "recurrenceSeriesId" text,
    "sourceTransactionId" text, "isArchived" boolean,
    "createdAt" timestamptz, "updatedAt" timestamptz, "archivedAt" timestamptz
  ) loop
    select space_id into strict remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item."spaceId";
    select id into strict remote_category_id from public.categories
     where space_id = remote_space_id and source_installation_id = p_installation_id
       and source_local_id = item."categoryId";
    remote_series_id := null;
    if item."recurrenceSeriesId" is not null then
      select id into strict remote_series_id from public.recurring_transaction_series
       where space_id = remote_space_id and source_installation_id = p_installation_id
         and source_local_id = item."recurrenceSeriesId";
    end if;
    insert into public.transactions(
      space_id, category_id, created_by, type, amount_minor, currency, title,
      occurred_on, recurrence, recurrence_series_id, recurrence_group_id,
      source_installation_id, source_local_id, source_local_transaction_id,
      is_archived, created_at, updated_at, archived_at
    ) values (
      remote_space_id, remote_category_id, current_user_id, item.type,
      item."amountMinor", item.currency, item.title, item."occurredOn",
      item.recurrence, remote_series_id, item."recurrenceGroupId",
      p_installation_id, item.id, item."sourceTransactionId", item."isArchived",
      item."createdAt", item."updatedAt", item."archivedAt"
    ) on conflict (space_id, source_installation_id, source_local_id) do update set
      category_id = excluded.category_id, type = excluded.type,
      amount_minor = excluded.amount_minor, currency = excluded.currency,
      title = excluded.title, occurred_on = excluded.occurred_on,
      recurrence = excluded.recurrence,
      recurrence_series_id = excluded.recurrence_series_id,
      recurrence_group_id = excluded.recurrence_group_id,
      source_local_transaction_id = excluded.source_local_transaction_id,
      is_archived = excluded.is_archived, updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  end loop;

  update public.guest_migration_batches set
    status = 'completed', space_count = jsonb_array_length(p_spaces),
    category_count = jsonb_array_length(p_categories),
    series_count = jsonb_array_length(p_recurring_series),
    transaction_count = jsonb_array_length(p_transactions), completed_at = now()
  where id = p_batch_id and user_id = current_user_id;

  return jsonb_build_object(
    'batchId', p_batch_id,
    'spaceCount', jsonb_array_length(p_spaces),
    'categoryCount', jsonb_array_length(p_categories),
    'seriesCount', jsonb_array_length(p_recurring_series),
    'transactionCount', jsonb_array_length(p_transactions)
  );
end;
$$;

revoke all on function public.migrate_guest_data(uuid, text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.migrate_guest_data(uuid, text, jsonb, jsonb, jsonb, jsonb) to authenticated;
