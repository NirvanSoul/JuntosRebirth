-- `create_space_invitation` devuelve una columna llamada `id`; dentro de
-- PL/pgSQL ese nombre también se vuelve una variable de salida. La versión
-- 16 dejó una referencia sin calificar a `spaces.id`, lo que impedía crear
-- tanto invitaciones dirigidas como enlaces manuales en instalaciones donde
-- ya se había aplicado esa migración.

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
  if not exists (select 1 from public.space_members members where members.space_id = p_space_id and members.user_id = current_user_id and members.role = 'owner' and members.status = 'active') then
    raise exception 'not_space_owner: solo un anfitrión del espacio puede invitar';
  end if;
  if not exists (select 1 from public.spaces spaces where spaces.id = p_space_id and spaces.type = 'couple' and spaces.archived_at is null) then
    raise exception 'invalid_space: el espacio no admite invitaciones';
  end if;
  normalized_email := nullif(lower(btrim(p_invitee_email)), '');
  if normalized_email is not null and not exists (select 1 from auth.users users where lower(users.email) = normalized_email) then
    raise exception 'invitee_not_registered: Parece que el correo al que quieres enviar la invitación aún no tiene una cuenta en Juntos, revisa el correo y vuélvelo a intentar.';
  end if;
  update public.space_invitations invitations set status = 'revoked'
    where invitations.space_id = p_space_id and invitations.status = 'pending'
      and invitations.invitee_email is not distinct from normalized_email;
  new_token := encode(extensions.gen_random_bytes(32), 'hex');
  new_token_hash := encode(extensions.digest(new_token, 'sha256'), 'hex');
  insert into public.space_invitations(space_id, invited_by, invitee_email, token_hash)
    values (p_space_id, current_user_id, normalized_email, new_token_hash)
    returning space_invitations.id, space_invitations.expires_at into new_invitation_id, new_expires_at;
  return query select new_invitation_id, new_token, new_expires_at;
end;
$$;
