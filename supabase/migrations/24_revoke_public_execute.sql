-- Revocar el privilegio de ejecución global de las funciones mutadoras principales
-- para evitar que roles no privilegiados (como anon) lo hereden de PUBLIC.

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

revoke all on function public.create_couple_space(text, text) from public;
grant execute on function public.create_couple_space(text, text) to authenticated;

revoke all on function public.accept_space_invitation(text) from public;
grant execute on function public.accept_space_invitation(text) to authenticated;

revoke all on function public.create_space_invitation(uuid, text) from public;
grant execute on function public.create_space_invitation(uuid, text) to authenticated;

revoke all on function public.dissolve_couple_space(uuid) from public;
grant execute on function public.dissolve_couple_space(uuid) to authenticated;

revoke all on function public.ensure_personal_space(text, text) from public;
grant execute on function public.ensure_personal_space(text, text) to authenticated;
