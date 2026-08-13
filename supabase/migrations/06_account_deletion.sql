-- Habilita el borrado/anonimización de cuenta (Legal/JUNTOSS_LEGAL_PRIVACY_
-- SYSTEM.md §§14-17). `created_by` pasa a admitir NULL y a limpiarse solo
-- cuando se borra el usuario, para que el contenido de un espacio
-- compartido sobreviva a la baja de quien lo creó sin dejar una referencia
-- colgante. Los movimientos con `created_by` nulo dejan de poder editarse
-- (las políticas de autor comparan contra auth.uid()), pero siguen
-- visibles para el resto de miembros del espacio.
--
-- Limitación conocida, pendiente de decisión de producto: si quien crea un
-- espacio compartido (spaces.created_by) elimina su cuenta, ese campo
-- también queda en NULL y la política spaces_update_owner deja de admitir
-- cambios sobre el espacio (nombre, moneda) hasta que se diseñe una
-- transferencia de propiedad. No se resuelve aquí porque hoy no existe
-- ningún usuario real que pueda verse afectado.
alter table public.categories
  alter column created_by drop not null,
  drop constraint categories_created_by_fkey,
  add constraint categories_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.recurring_transaction_series
  alter column created_by drop not null,
  drop constraint recurring_transaction_series_created_by_fkey,
  add constraint recurring_transaction_series_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.transactions
  alter column created_by drop not null,
  drop constraint transactions_created_by_fkey,
  add constraint transactions_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.spaces
  alter column created_by drop not null,
  drop constraint spaces_created_by_fkey,
  add constraint spaces_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

-- Limpia los datos del usuario que llama antes de que la Edge Function
-- `delete-account` borre la fila de auth.users con la Admin API (una
-- función SQL normal no puede borrar auth.users). Debe ejecutarse siempre
-- justo antes de ese borrado, nunca de forma aislada.
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  solo_space_id uuid;
  deleted_space_count integer := 0;
  left_space_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  -- Espacios donde el usuario es el único miembro activo: no hay datos
  -- legítimos de otra persona que preservar, se eliminan por completo.
  for solo_space_id in
    select sm.space_id
      from public.space_members sm
     where sm.user_id = current_user_id
       and sm.status = 'active'
       and not exists (
         select 1 from public.space_members other
          where other.space_id = sm.space_id
            and other.user_id <> current_user_id
            and other.status = 'active'
       )
  loop
    delete from public.transactions where space_id = solo_space_id;
    delete from public.recurring_transaction_series where space_id = solo_space_id;
    delete from public.categories where space_id = solo_space_id;
    delete from public.space_members where space_id = solo_space_id;
    delete from public.spaces where id = solo_space_id;
    deleted_space_count := deleted_space_count + 1;
  end loop;

  -- Espacios compartidos donde queda otra persona activa: el usuario deja
  -- de ser miembro; sus movimientos y categorías se conservan y quedarán
  -- sin autor (`created_by = null`) en cuanto se borre su cuenta.
  update public.space_members
     set status = 'removed', left_at = now(), updated_at = now()
   where user_id = current_user_id
     and status = 'active';
  get diagnostics left_space_count = row_count;

  return jsonb_build_object(
    'deletedSpaceCount', deleted_space_count,
    'leftSpaceCount', left_space_count
  );
end;
$$;

revoke all on function public.request_account_deletion() from anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;
