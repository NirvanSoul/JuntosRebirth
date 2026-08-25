-- Los avisos push son un complemento de la invitación persistida, nunca la
-- fuente de verdad. El token pertenece al usuario autenticado y no queda
-- expuesto por la Data API; solo se registra mediante RPC controlado.

create table public.user_push_tokens (
  expo_push_token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_expo_format check (
    expo_push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$'
  )
);

create index user_push_tokens_user_id_idx
  on public.user_push_tokens(user_id);

alter table public.user_push_tokens enable row level security;

revoke all on table public.user_push_tokens from anon, authenticated;
grant select, delete on table public.user_push_tokens to service_role;

alter table public.space_invitations
  add column push_notification_attempted_at timestamptz;

-- El producto invita a una sola pareja. Cambiar el correo invalida cualquier
-- invitación pendiente anterior del espacio, no solo la del mismo destino.
create or replace function public.revoke_previous_space_invitation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.space_invitations
     set status = 'revoked'
   where space_id = new.space_id
     and status = 'pending';
  return new;
end;
$$;

create trigger space_invitations_revoke_previous_before_insert
before insert on public.space_invitations
for each row execute function public.revoke_previous_space_invitation();

revoke all on function public.revoke_previous_space_invitation() from public;

create or replace function public.register_current_user_push_token(
  p_expo_push_token text,
  p_platform text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_token text := btrim(p_expo_push_token);
begin
  if current_user_id is null then
    raise exception 'authentication_required: inicia sesión para activar las notificaciones';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'invalid_platform: plataforma de notificaciones inválida';
  end if;
  if normalized_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid_push_token: token de notificaciones inválido';
  end if;

  insert into public.user_push_tokens(
    expo_push_token,
    user_id,
    platform
  ) values (
    normalized_token,
    current_user_id,
    p_platform
  )
  on conflict (expo_push_token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.unregister_current_user_push_token(
  p_expo_push_token text
)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.user_push_tokens
   where expo_push_token = btrim(p_expo_push_token)
     and user_id = (select auth.uid());
$$;

-- La Edge Function valida primero que quien llama creó la invitación. Esta
-- segunda barrera, exclusiva de service_role, reclama el envío una sola vez y
-- resuelve el usuario destinatario sin exponer auth.users al cliente.
create or replace function public.claim_space_invitation_push(
  p_invitation_id uuid
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  recipient_user_id uuid;
begin
  update public.space_invitations invitations
     set push_notification_attempted_at = now()
    from auth.users users
   where invitations.id = p_invitation_id
     and invitations.status = 'pending'
     and invitations.expires_at >= now()
     and invitations.invitee_email is not null
     and lower(users.email) = invitations.invitee_email
     and invitations.push_notification_attempted_at is null
  returning users.id into recipient_user_id;

  if recipient_user_id is null then
    return null;
  end if;
  return jsonb_build_object('recipientUserId', recipient_user_id);
end;
$$;

revoke all on function public.register_current_user_push_token(text, text) from public;
grant execute on function public.register_current_user_push_token(text, text) to authenticated;
revoke all on function public.unregister_current_user_push_token(text) from public;
grant execute on function public.unregister_current_user_push_token(text) to authenticated;
revoke all on function public.claim_space_invitation_push(uuid) from public;
grant execute on function public.claim_space_invitation_push(uuid) to service_role;
