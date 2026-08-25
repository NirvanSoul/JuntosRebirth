-- El espacio pendiente y su primera invitación son una sola operación de
-- producto. Si el correo no existe, la inserción de la invitación falla o la
-- transacción se interrumpe, PostgreSQL revierte también el espacio y su
-- membresía: nunca queda un borrador que la app pueda confundir con una
-- invitación enviada.

create function public.create_couple_space_invitation(
  p_name text default 'Juntos',
  p_currency text default 'EUR',
  p_invitee_email text default null
)
returns table (
  space_id uuid,
  invitation_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_email text := nullif(lower(btrim(p_invitee_email)), '');
  new_space_id uuid;
  new_token text;
  new_invitation_id uuid;
  new_expires_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'authentication_required: inicia sesión para crear un espacio juntos';
  end if;
  if normalized_email is null then
    raise exception 'invalid_email: escribe el correo de tu pareja';
  end if;
  if not exists (
    select 1 from auth.users users where lower(users.email) = normalized_email
  ) then
    raise exception 'invitee_not_registered: Parece que el correo al que quieres enviar la invitación aún no tiene una cuenta en Juntos, revisa el correo y vuélvelo a intentar.';
  end if;
  if exists (
    select 1 from public.space_members members
     where members.user_id = current_user_id
       and members.status = 'active'
       and members.space_type = 'couple'
  ) then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end if;

  insert into public.spaces(name, type, currency, created_by, activated_at)
  values (p_name, 'couple', p_currency, current_user_id, null)
  returning id into new_space_id;

  begin
    insert into public.space_members(
      space_id,
      user_id,
      role,
      status,
      space_type
    ) values (
      new_space_id,
      current_user_id,
      'owner',
      'active',
      'couple'
    );
  exception when unique_violation then
    raise exception 'already_in_couple_space: ya perteneces a un espacio juntos activo';
  end;

  new_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.space_invitations(
    space_id,
    invited_by,
    invitee_email,
    token_hash
  ) values (
    new_space_id,
    current_user_id,
    normalized_email,
    encode(extensions.digest(new_token, 'sha256'), 'hex')
  )
  returning id, space_invitations.expires_at
    into new_invitation_id, new_expires_at;

  return query select new_space_id, new_invitation_id, new_expires_at;
end;
$$;

revoke all on function public.create_couple_space_invitation(text, text, text)
  from public, anon;
grant execute on function public.create_couple_space_invitation(text, text, text)
  to authenticated;
