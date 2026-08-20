-- Migration 25: Revocar accesos anónimos no autorizados y ajustar privilegios en legal_acceptances
--
-- Auditoría de SECURITY DEFINER permitidos a anon:
-- accept_current_user_space_invitation(uuid) -> consumidor legítimo: authenticated
-- ensure_personal_space(text,text) -> consumidor legítimo: authenticated
-- get_current_user_pending_space_invitation() -> consumidor legítimo: authenticated
-- get_space_invitation_preview(text) -> consumidor legítimo: anon, authenticated (se conserva)
-- handle_new_user() -> consumidor legítimo: trigger auth (se revoca de public)
-- is_active_space_member(uuid) -> consumidor legítimo: authenticated
-- sync_couple_space_data(uuid,text,jsonb,jsonb,jsonb) -> consumidor legítimo: authenticated

-- Revocar y conceder privilegios a authenticated
revoke all on function public.accept_current_user_space_invitation(uuid) from public, anon;
grant execute on function public.accept_current_user_space_invitation(uuid) to authenticated;

revoke all on function public.ensure_personal_space(text, text) from public, anon;
grant execute on function public.ensure_personal_space(text, text) to authenticated;

revoke all on function public.get_current_user_pending_space_invitation() from public, anon;
grant execute on function public.get_current_user_pending_space_invitation() to authenticated;

revoke all on function public.handle_new_user() from public, anon;
-- Los triggers son ejecutados por el dueño de la base de datos o el que dispara el evento. No requiere EXECUTE manual.

revoke all on function public.is_active_space_member(uuid) from public, anon;
grant execute on function public.is_active_space_member(uuid) to authenticated;

revoke all on function public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb) to authenticated;

-- En legal_acceptances, revocar los privilegios amplios de authenticated y conceder exclusivamente SELECT, INSERT.
revoke all on table public.legal_acceptances from public, anon, authenticated;
grant select, insert on table public.legal_acceptances to authenticated;
