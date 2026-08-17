-- 24_share_space_member_profiles.sql
-- Permite leer el perfil de quien comparte un espacio activo con el usuario.
--
-- Hasta ahora `profiles_select_own` limitaba la lectura a la fila propia, así que
-- el cliente no tenía forma de conocer el nombre de la otra persona de un espacio
-- juntos. Eso impedía atribuir un movimiento a su autor: la interfaz solo podía
-- mostrar un uuid.
--
-- La política nueva no sustituye a `profiles_select_own`: las políticas SELECT se
-- combinan con OR, y conservarla mantiene legible el perfil propio aunque el
-- usuario no pertenezca todavía a ningún espacio con miembros activos.
--
-- Alcance de lo que se expone: la política es de fila, no de columna, así que la
-- otra persona ve también `locale` y `default_currency`. Son datos de
-- preferencia, no credenciales, y ambos miembros ya comparten los importes del
-- espacio. `avatar_url` sigue siendo siempre null: ninguna parte de la app la
-- escribe todavía.

create or replace function public.shares_active_space_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.space_members as viewer
      join public.space_members as target
        on target.space_id = viewer.space_id
     where viewer.user_id = (select auth.uid())
       and viewer.status = 'active'
       and target.user_id = target_user_id
       and target.status = 'active'
  );
$$;

-- `security definer` es obligatorio, no una optimización: sin él, la subconsulta
-- sobre `space_members` volvería a evaluar `members_select_member`, que a su vez
-- consulta `space_members`. La función corta esa recursión igual que ya hace
-- `public.is_active_space_member`.

create policy profiles_select_space_member on public.profiles for select to authenticated
  using (public.shares_active_space_with(id));

grant execute on function public.shares_active_space_with(uuid) to authenticated;
