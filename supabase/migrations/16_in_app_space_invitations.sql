-- Las invitaciones por correo dejan de depender de Resend. El correo solo
-- identifica una cuenta existente; esa cuenta ve y acepta la invitación al
-- abrir Juntoss. El enlace manual sigue usando el token de la migración 07.

drop index if exists public.space_invitations_one_pending_per_space_idx;
create unique index space_invitations_one_pending_per_target_idx
  on public.space_invitations(space_id, coalesce(invitee_email, ''))
  where status = 'pending';

create or replace function public.create_space_invitation(
  p_space_id uuid,
  p_invitee_email text default null
)
returns table (id uuid, plaintext_token text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid()); normalized_email text;
  new_token text; new_token_hash text; new_invitation_id uuid; new_expires_at timestamptz;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.space_members where space_id = p_space_id and user_id = current_user_id and role = 'owner' and status = 'active') then
    raise exception 'not_space_owner: solo un anfitrión del espacio puede invitar';
  end if;
  if not exists (
    select 1 from public.spaces spaces
     where spaces.id = p_space_id
       and spaces.type = 'couple'
       and spaces.archived_at is null
  ) then
    raise exception 'invalid_space: el espacio no admite invitaciones';
  end if;
  normalized_email := nullif(lower(btrim(p_invitee_email)), '');
  if normalized_email is not null and not exists (select 1 from auth.users where lower(email) = normalized_email) then
    raise exception 'invitee_not_registered: Parece que el correo al que quieres enviar la invitación aún no tiene una cuenta en Juntos, revisa el correo y vuélvelo a intentar.';
  end if;
  update public.space_invitations set status = 'revoked'
    where space_id = p_space_id and status = 'pending'
      and invitee_email is not distinct from normalized_email;
  new_token := encode(extensions.gen_random_bytes(32), 'hex');
  new_token_hash := encode(extensions.digest(new_token, 'sha256'), 'hex');
  insert into public.space_invitations(space_id, invited_by, invitee_email, token_hash)
    values (p_space_id, current_user_id, normalized_email, new_token_hash)
    returning space_invitations.id, space_invitations.expires_at into new_invitation_id, new_expires_at;
  return query select new_invitation_id, new_token, new_expires_at;
end;
$$;

create or replace function public.get_current_user_pending_space_invitation()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare invitation record; current_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select lower(email) into current_email from auth.users where id = auth.uid();
  select i.id, s.name as space_name, coalesce(p.display_name, 'Alguien') as inviter_name
    into invitation
    from public.space_invitations i
    join public.spaces s on s.id = i.space_id
    left join public.profiles p on p.id = i.invited_by
   where i.status = 'pending' and i.expires_at >= now()
     and i.invitee_email = current_email and s.type = 'couple' and s.archived_at is null
   order by i.created_at desc limit 1;
  if invitation.id is null then return null; end if;
  return jsonb_build_object('invitationId', invitation.id, 'spaceName', invitation.space_name, 'inviterDisplayName', invitation.inviter_name);
end;
$$;

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
  return jsonb_build_object('spaceId', target_space.id, 'spaceName', target_space.name);
end;
$$;

revoke all on function public.get_current_user_pending_space_invitation() from public;
grant execute on function public.get_current_user_pending_space_invitation() to authenticated;
revoke all on function public.accept_current_user_space_invitation(uuid) from public;
grant execute on function public.accept_current_user_space_invitation(uuid) to authenticated;
