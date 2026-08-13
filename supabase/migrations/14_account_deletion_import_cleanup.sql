-- `request_account_deletion` (migration 06) was never updated when
-- migration 10 added `user_merchant_rules`, `import_batches`, and
-- `import_items` with `on delete restrict` foreign keys into
-- `spaces`/`categories`/`transactions`. Any authenticated user who has ever
-- imported a bank statement gets an unhandled FK-violation exception when
-- deleting their account, since the solo-space cleanup loop tries to delete
-- `transactions`/`categories`/`spaces` while those import rows still
-- reference them. This clears the import-learning tables first, same as the
-- other per-space cleanup already in the loop.
begin;

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

commit;
