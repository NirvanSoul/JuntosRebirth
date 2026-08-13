-- Fixes a mismatch found in the import-feature audit (2026-08-09): this
-- table allowed 'tsv' but the client's ImportSourceExtension type and
-- importAcceptedExtensions never produce it, so the value was dead capacity
-- that supabaseImportReviewReadGateway had to defensively filter out. Align
-- the remote constraint with what SQLite (currentVersion < 12) and the
-- client actually emit: ('xls', 'xlsx', 'csv'). A migration already applied
-- is not edited (Bible/DATABASE.md); this correction lands in a new one.
begin;

alter table public.import_batches
  drop constraint import_batches_source_type_check,
  add constraint import_batches_source_type_check
    check (source_type in ('xls', 'xlsx', 'csv'));

create or replace function public.sync_import_batches(
  p_installation_id text,
  p_batches jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  batch_item record;
  import_item record;
  target_space_id uuid;
  target_category_id uuid;
  target_duplicate_transaction_id uuid;
  stored_batch_user_id uuid;
  batch_count integer := 0;
  item_count integer := 0;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_installation_id), '') is null then raise exception 'installation required'; end if;
  if jsonb_typeof(p_batches) <> 'array' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'import payload must contain arrays';
  end if;

  for batch_item in select * from jsonb_to_recordset(p_batches) as x(
    id uuid,
    space_local_id text,
    source_type text,
    status text,
    total_items integer,
    review_items integer,
    duplicate_items integer,
    created_at timestamptz,
    updated_at timestamptz,
    completed_at timestamptz
  ) loop
    if batch_item.id is null
       or nullif(btrim(batch_item.space_local_id), '') is null
       or batch_item.source_type not in ('xls', 'xlsx', 'csv')
       or batch_item.status not in ('parsing', 'mapping_required', 'needs_review', 'ready', 'imported', 'failed', 'cancelled')
       or batch_item.total_items < 0 or batch_item.review_items < 0 or batch_item.duplicate_items < 0 then
      raise exception 'invalid import batch payload';
    end if;

    select sls.space_id into target_space_id
      from public.space_local_sources sls
     where sls.user_id = current_user_id
       and sls.installation_id = p_installation_id
       and sls.local_id = batch_item.space_local_id;
    if target_space_id is null or not public.is_active_space_member(target_space_id) then
      raise exception 'local import space is not available to this user';
    end if;

    select user_id into stored_batch_user_id
      from public.import_batches where id = batch_item.id;
    if stored_batch_user_id is not null and stored_batch_user_id <> current_user_id then
      raise exception 'import batch belongs to another user';
    end if;

    insert into public.import_batches (
      id, user_id, space_id, source_type, status, total_items, review_items,
      duplicate_items, created_at, updated_at, completed_at
    ) values (
      batch_item.id, current_user_id, target_space_id, batch_item.source_type,
      batch_item.status, batch_item.total_items, batch_item.review_items,
      batch_item.duplicate_items, coalesce(batch_item.created_at, now()),
      coalesce(batch_item.updated_at, now()), batch_item.completed_at
    ) on conflict (id) do update
      set source_type = excluded.source_type,
          status = excluded.status,
          total_items = excluded.total_items,
          review_items = excluded.review_items,
          duplicate_items = excluded.duplicate_items,
          updated_at = excluded.updated_at,
          completed_at = excluded.completed_at
      where import_batches.user_id = current_user_id
        and import_batches.space_id = target_space_id
        and import_batches.updated_at <= excluded.updated_at;
    batch_count := batch_count + 1;
  end loop;

  for import_item in select * from jsonb_to_recordset(p_items) as x(
    id uuid,
    batch_id uuid,
    category_local_id text,
    duplicate_transaction_local_id text,
    source_row integer,
    raw_description text,
    normalized_merchant text,
    occurred_on date,
    amount_minor bigint,
    currency text,
    movement_type text,
      duplicate_status text,
      item_status text,
      is_selected boolean,
    issues jsonb,
    created_at timestamptz,
    updated_at timestamptz
  ) loop
    if import_item.id is null or import_item.batch_id is null
       or import_item.source_row is null or import_item.source_row <= 0
       or import_item.movement_type not in ('expense', 'income', 'unknown')
       or import_item.duplicate_status not in ('none', 'exact', 'probable')
       or import_item.item_status not in ('pending', 'ready', 'ignored', 'duplicate', 'imported', 'error')
       or jsonb_typeof(coalesce(import_item.issues, '[]'::jsonb)) <> 'array' then
      raise exception 'invalid import item payload';
    end if;

    select b.space_id into target_space_id
      from public.import_batches b
     where b.id = import_item.batch_id
       and b.user_id = current_user_id;
    if target_space_id is null or not public.is_active_space_member(target_space_id) then
      raise exception 'import batch is not available to this user';
    end if;

    target_category_id := null;
    if nullif(btrim(import_item.category_local_id), '') is not null then
      select c.id into target_category_id
        from public.categories c
       where c.space_id = target_space_id
         and c.source_installation_id = p_installation_id
         and c.source_local_id = import_item.category_local_id;
      if target_category_id is null then
        raise exception 'local import category is not available in its mapped space';
      end if;
    end if;

    target_duplicate_transaction_id := null;
    if nullif(btrim(import_item.duplicate_transaction_local_id), '') is not null then
      select t.id into target_duplicate_transaction_id
        from public.transactions t
       where t.space_id = target_space_id
         and t.source_installation_id = p_installation_id
         and t.source_local_id = import_item.duplicate_transaction_local_id;
    end if;

    insert into public.import_items (
      id, batch_id, space_id, source_row, raw_description, normalized_merchant,
      occurred_on, amount_minor, currency, movement_type, final_category_id,
      duplicate_status, duplicate_transaction_id, item_status, is_selected, issues,
      created_at, updated_at
    ) values (
      import_item.id, import_item.batch_id, target_space_id,
      import_item.source_row, import_item.raw_description,
      import_item.normalized_merchant, import_item.occurred_on,
      import_item.amount_minor, import_item.currency, import_item.movement_type,
      target_category_id, import_item.duplicate_status,
      target_duplicate_transaction_id, import_item.item_status,
      coalesce(import_item.is_selected, false),
      coalesce(import_item.issues, '[]'::jsonb),
      coalesce(import_item.created_at, now()),
      coalesce(import_item.updated_at, now())
    ) on conflict (id) do update
      set final_category_id = excluded.final_category_id,
          duplicate_status = excluded.duplicate_status,
          duplicate_transaction_id = excluded.duplicate_transaction_id,
          item_status = excluded.item_status,
          is_selected = excluded.is_selected,
          issues = excluded.issues,
          updated_at = excluded.updated_at
      where import_items.batch_id = import_item.batch_id
        and import_items.space_id = target_space_id
        and import_items.updated_at <= excluded.updated_at;
    item_count := item_count + 1;
  end loop;

  return jsonb_build_object('batchCount', batch_count, 'itemCount', item_count);
end;
$$;

commit;
