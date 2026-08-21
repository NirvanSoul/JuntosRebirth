-- 26_spaces_currency_immutable.sql
-- ADR-080 Entrega 3: protege spaces.currency contra UPDATEs directos del rol
-- authenticated. La función migrate_guest_data (SECURITY DEFINER, corre como
-- el owner) sigue pudiendo actualizar la moneda durante la migración de
-- invitados, preservando la compatibilidad del flujo de adopción.

create or replace function public.prevent_space_currency_change()
returns trigger
language plpgsql
as $$
begin
  -- El owner (postgres) puede modificar currency: SECURITY DEFINER functions
  -- y operaciones de administración lo requieren.
  if current_user = 'postgres' then
    return NEW;
  end if;

  if NEW.currency is distinct from OLD.currency then
    raise exception 'spaces.currency es inmutable tras la creación del espacio';
  end if;

  return NEW;
end;
$$;

revoke all on function public.prevent_space_currency_change()
  from public, anon, authenticated;
-- Los triggers son ejecutados por el dueño de la base de datos o el que
-- dispara el evento. No requiere EXECUTE manual.

create trigger spaces_currency_immutable
before update on public.spaces
for each row
execute function public.prevent_space_currency_change();
