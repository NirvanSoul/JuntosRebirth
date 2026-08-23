-- Salir de un espacio juntos es una acción individual. El espacio solo se
-- borra cuando ya no queda ningún miembro activo, de modo que quien sale
-- puede volver a entrar mediante una invitación nueva mientras la otra
-- persona siga dentro.

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
  if invitation.status = 'accepted' and invitation.accepted_by = current_user_id then
    select id, name into target_space from public.spaces where id = invitation.space_id;
    return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
  end if;
  if invitation.status = 'accepted' then raise exception 'invitation_already_used: esta invitación ya fue aceptada'; end if;
  if invitation.status = 'revoked' then raise exception 'invitation_revoked: esta invitación fue revocada'; end if;
  if invitation.expires_at < now() then raise exception 'invitation_expired: esta invitación caducó'; end if;

  if invitation.invitee_email is not null then
    select lower(email) into current_user_email from auth.users where id = current_user_id;
    if current_user_email is distinct from invitation.invitee_email then
      raise exception 'invitation_wrong_email: esta invitación es para otra dirección de correo';
    end if;
  end if;

  select id, type, archived_at, name into target_space
    from public.spaces where id = invitation.space_id;
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
    values (target_space.id, current_user_id, 'owner', 'active', 'couple')
    on conflict (space_id, user_id) do update
      set role = 'owner', status = 'active', joined_at = now(), left_at = null,
          updated_at = now();
  exception when unique_violation then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end;

  update public.space_invitations
     set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
   where id = invitation.id;
  update public.spaces
     set activated_at = coalesce(activated_at, now()), updated_at = now()
   where id = target_space.id;

  return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
end;
$$;

create or replace function public.accept_current_user_space_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invitation record;
  target_space record;
  active_member_count integer;
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
    insert into public.space_members(space_id, user_id, role, status, space_type)
    values (target_space.id, current_user_id, 'owner', 'active', 'couple')
    on conflict (space_id, user_id) do update
      set role = 'owner', status = 'active', joined_at = now(), left_at = null,
          updated_at = now();
  exception when unique_violation then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end;

  update public.space_invitations set status = 'accepted', accepted_by = current_user_id, accepted_at = now() where id = invitation.id;
  update public.spaces set activated_at = coalesce(activated_at, now()), updated_at = now() where id = target_space.id;
  return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
end;
$$;

create function public.leave_couple_space(p_space_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_space record;
  active_member_count integer;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  -- Serializa salidas concurrentes: la segunda ve la primera ya confirmada y
  -- elimina el espacio si ya no queda nadie dentro.
  select id, type, archived_at into target_space
    from public.spaces
   where id = p_space_id
     and type = 'couple'
     and archived_at is null
   for update;
  if target_space.id is null then
    raise exception 'invalid_space: el espacio ya no está disponible';
  end if;

  if not exists (
    select 1 from public.space_members
     where space_id = p_space_id
       and user_id = current_user_id
       and status = 'active'
  ) then
    raise exception 'not_active_space_member: ya no perteneces a este espacio';
  end if;

  update public.space_members
     set status = 'left', left_at = now(), updated_at = now()
   where space_id = p_space_id
     and user_id = current_user_id
     and status = 'active';

  select count(*) into active_member_count
    from public.space_members
   where space_id = p_space_id and status = 'active';
  if active_member_count > 0 then
    return jsonb_build_object('spaceId', p_space_id, 'deleted', false);
  end if;

  -- Ya no queda nadie con derecho a conservar el espacio: se elimina junto
  -- con sus datos para no dejar un espacio huérfano e inaccesible.
  delete from public.import_items where space_id = p_space_id;
  delete from public.import_batches where space_id = p_space_id;
  delete from public.user_merchant_rules where space_id = p_space_id;
  delete from public.transactions where space_id = p_space_id;
  delete from public.recurring_transaction_series where space_id = p_space_id;
  delete from public.money_accounts where space_id = p_space_id;
  delete from public.categories where space_id = p_space_id;
  delete from public.space_members where space_id = p_space_id;
  delete from public.spaces where id = p_space_id;

  return jsonb_build_object('spaceId', p_space_id, 'deleted', true);
end;
$$;

revoke all on function public.leave_couple_space(uuid) from public, anon;
grant execute on function public.leave_couple_space(uuid) to authenticated;

drop function if exists public.dissolve_couple_space(uuid);
