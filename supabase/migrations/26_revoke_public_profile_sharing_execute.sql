-- `EXECUTE` se concede a PUBLIC por defecto en PostgreSQL. La migración 24
-- autorizó explícitamente a authenticated, pero no retiró ese privilegio
-- heredado. La función solo sirve de apoyo a políticas autenticadas, así que
-- no debe poder invocarla anon ni PUBLIC.

revoke all on function public.shares_active_space_with(uuid) from public, anon;
grant execute on function public.shares_active_space_with(uuid) to authenticated;
