-- La eliminación de cuenta fallaba para cualquier usuario que hubiera
-- pertenecido a un espacio compartido (juntos), incluido el caso de un
-- espacio ya disuelto por la pareja.
--
-- Causa 1 — claves foráneas que bloquean el borrado de `auth.users`:
-- la migración 06 hizo nulable `created_by` con `on delete set null` en
-- `spaces`, `categories`, `recurring_transaction_series` y `transactions`,
-- pero dos tablas posteriores repitieron el patrón antiguo
-- (`created_by uuid not null references auth.users(id)`, sin acción
-- `on delete`, es decir `NO ACTION`):
--   * `transaction_notification_rules` (migración 04)
--   * `category_budgets` (migración 08)
-- `request_account_deletion()` solo borra esas filas cuando arrastra el
-- espacio entero (son `on delete cascade` respecto a `spaces`/`categories`),
-- cosa que únicamente ocurre en espacios en solitario. En un espacio
-- compartido las filas sobreviven a propósito, así que
-- `auth.admin.deleteUser()` chocaba contra la FK y la Edge Function
-- devolvía 500: los datos quedaban medio limpiados y la cuenta seguía viva.
--
-- Causa 2 — el bucle de espacios en solitario exigía `status = 'active'`
-- en la membresía de quien llama. Dos situaciones reales lo dejaban sin
-- efecto y abandonaban datos personales para siempre:
--   * Reintento: el primer intento ya marcó todas las membresías como
--     'removed' antes de fallar en el borrado de `auth.users`, así que el
--     segundo intento no encontraba ningún espacio que limpiar y dejaba
--     intacto el espacio personal del usuario.
--   * Espacio juntos disuelto por la pareja (`dissolve_couple_space`):
--     deja ambas membresías en 'removed' y archiva el espacio, que
--     `useSpaces` ya filtra por `archived_at is null` y las políticas RLS
--     ocultan por `is_active_space_member`. El espacio queda invisible para
--     todo el mundo y ninguna eliminación de cuenta lo tocaba.
--
-- Causa 3 — `login_attempts` (migración 15) guarda el email en claro y no
-- tiene ninguna FK hacia `auth.users`, así que sobrevivía a la baja.
begin;

-- 1. Las FK que bloqueaban el borrado, alineadas con la decisión de la
--    migración 06: el dato compartido sobrevive y pierde su autoría.
alter table public.transaction_notification_rules
  alter column created_by drop not null,
  drop constraint if exists transaction_notification_rules_created_by_fkey,
  add constraint transaction_notification_rules_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.category_budgets
  alter column created_by drop not null,
  drop constraint if exists category_budgets_created_by_fkey,
  add constraint category_budgets_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

-- 2. Limpieza completa, independiente del estado de la membresía.
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_user_email text;
  solo_space_id uuid;
  deleted_space_count integer := 0;
  left_space_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  -- Espacios sin nadie más a quien preservarle datos. Dos casos:
  --   (a) el usuario sigue activo y no queda ninguna otra persona activa
  --       (espacio personal, o compartido que la pareja ya abandonó);
  --   (b) el usuario ya no está activo y no existe ninguna otra membresía
  --       en absoluto (reintento tras un fallo previo).
  -- Un espacio juntos disuelto conserva la membresía 'removed' de la
  -- pareja, así que cae fuera de (b) y no se borra: sus movimientos siguen
  -- siendo también de la otra persona y solo pierden la autoría.
  for solo_space_id in
    select sm.space_id
      from public.space_members sm
     where sm.user_id = current_user_id
       and (
         (
           sm.status = 'active'
           and not exists (
             select 1 from public.space_members other
              where other.space_id = sm.space_id
                and other.user_id <> current_user_id
                and other.status = 'active'
           )
         )
         or not exists (
           select 1 from public.space_members other
            where other.space_id = sm.space_id
              and other.user_id <> current_user_id
         )
       )
  loop
    delete from public.import_items where space_id = solo_space_id;
    delete from public.import_batches where space_id = solo_space_id;
    delete from public.user_merchant_rules where space_id = solo_space_id;
    delete from public.transactions where space_id = solo_space_id;
    delete from public.recurring_transaction_series where space_id = solo_space_id;
    delete from public.categories where space_id = solo_space_id;
    delete from public.space_members where space_id = solo_space_id;
    delete from public.spaces where id = solo_space_id;
    deleted_space_count := deleted_space_count + 1;
  end loop;

  -- Espacios compartidos donde queda otra persona: el usuario deja de ser
  -- miembro; sus movimientos, categorías, presupuestos y reglas de aviso se
  -- conservan y quedarán sin autor (`created_by = null`) en cuanto se borre
  -- su cuenta.
  update public.space_members
     set status = 'removed', left_at = now(), updated_at = now()
   where user_id = current_user_id
     and status = 'active';
  get diagnostics left_space_count = row_count;

  -- El histórico de intentos de acceso se indexa por email, no por id, así
  -- que ninguna FK lo arrastra al borrar la cuenta.
  select email into current_user_email from auth.users where id = current_user_id;
  if current_user_email is not null then
    delete from public.login_attempts where email = lower(btrim(current_user_email));
  end if;

  return jsonb_build_object(
    'deletedSpaceCount', deleted_space_count,
    'leftSpaceCount', left_space_count
  );
end;
$$;

commit;
