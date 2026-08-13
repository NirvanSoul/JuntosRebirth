-- STEP 8 — Import learning persistence. Adapted from the template in
-- 09_JUNTOSS_IMPORT_LEARNING_SCHEMA_TEMPLATE.sql to the actual schema:
-- spaces/categories/transactions all use UUIDs and active membership is
-- enforced by public.is_active_space_member.

begin;

-- transactions predates this migration and only had a plain primary key;
-- the composite FKs below from import_items need (id, space_id) to be
-- unique so a row can't be referenced across the wrong space.
alter table public.transactions
  add constraint transactions_id_space_id_unique unique (id, space_id);

create table public.user_merchant_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete restrict,
  normalized_merchant text not null check (length(btrim(normalized_merchant)) > 0),
  category_id uuid not null,
  confirmations integer not null default 1 check (confirmations >= 1),
  source text not null default 'import_correction'
    check (source in ('manual', 'import_correction', 'system')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, space_id, normalized_merchant),
  foreign key (category_id, space_id)
    references public.categories(id, space_id) on delete restrict
);

create index user_merchant_rules_lookup_idx
  on public.user_merchant_rules (user_id, space_id, normalized_merchant);

alter table public.user_merchant_rules enable row level security;

create policy user_merchant_rules_select_own on public.user_merchant_rules
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

create policy user_merchant_rules_insert_own on public.user_merchant_rules
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

create policy user_merchant_rules_update_own on public.user_merchant_rules
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

create policy user_merchant_rules_delete_own on public.user_merchant_rules
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

create table public.import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete restrict,
  source_type text not null check (source_type in ('xls', 'xlsx', 'csv', 'tsv')),
  file_hash text,
  source_profile text,
  status text not null default 'parsing' check (status in (
    'parsing', 'mapping_required', 'needs_review', 'ready', 'imported',
    'failed', 'cancelled'
  )),
  total_items integer not null default 0 check (total_items >= 0),
  review_items integer not null default 0 check (review_items >= 0),
  duplicate_items integer not null default 0 check (duplicate_items >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, space_id)
);

create index import_batches_user_idx
  on public.import_batches (user_id, created_at desc);
create index import_batches_space_idx
  on public.import_batches (space_id, created_at desc);
create unique index import_batches_user_file_hash_idx
  on public.import_batches (user_id, space_id, file_hash)
  where file_hash is not null;

alter table public.import_batches enable row level security;

create policy import_batches_select_own on public.import_batches
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );
create policy import_batches_insert_own on public.import_batches
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );
create policy import_batches_update_own on public.import_batches
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );
create policy import_batches_delete_own on public.import_batches
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_active_space_member(space_id)
  );

create table public.import_items (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null,
  space_id uuid not null,
  source_row integer check (source_row > 0),
  sheet_name text,
  raw_description text,
  normalized_merchant text,
  occurred_on date,
  amount_minor bigint check (amount_minor > 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  movement_type text check (movement_type in ('expense', 'income', 'unknown')),
  final_category_id uuid,
  duplicate_status text not null default 'none'
    check (duplicate_status in ('none', 'exact', 'probable')),
  duplicate_transaction_id uuid,
  item_status text not null default 'pending'
    check (item_status in ('pending', 'ready', 'ignored', 'duplicate', 'imported', 'error')),
  is_selected boolean not null default false,
  created_transaction_id uuid,
  issues jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (batch_id, space_id)
    references public.import_batches(id, space_id) on delete cascade,
  foreign key (final_category_id, space_id)
    references public.categories(id, space_id) on delete restrict,
  foreign key (duplicate_transaction_id, space_id)
    references public.transactions(id, space_id) on delete restrict,
  foreign key (created_transaction_id, space_id)
    references public.transactions(id, space_id) on delete restrict
);

create index import_items_batch_idx on public.import_items (batch_id);
create index import_items_pending_idx
  on public.import_items (space_id, item_status, updated_at desc);

alter table public.import_items enable row level security;

create policy import_items_select_own_batch on public.import_items
  for select to authenticated
  using (exists (
    select 1 from public.import_batches b
    where b.id = import_items.batch_id
      and b.space_id = import_items.space_id
      and b.user_id = (select auth.uid())
      and public.is_active_space_member(b.space_id)
  ));
create policy import_items_insert_own_batch on public.import_items
  for insert to authenticated
  with check (exists (
    select 1 from public.import_batches b
    where b.id = import_items.batch_id
      and b.space_id = import_items.space_id
      and b.user_id = (select auth.uid())
      and public.is_active_space_member(b.space_id)
  ));
create policy import_items_update_own_batch on public.import_items
  for update to authenticated
  using (exists (
    select 1 from public.import_batches b
    where b.id = import_items.batch_id
      and b.space_id = import_items.space_id
      and b.user_id = (select auth.uid())
      and public.is_active_space_member(b.space_id)
  ))
  with check (exists (
    select 1 from public.import_batches b
    where b.id = import_items.batch_id
      and b.space_id = import_items.space_id
      and b.user_id = (select auth.uid())
      and public.is_active_space_member(b.space_id)
  ));

revoke all on public.user_merchant_rules, public.import_batches,
  public.import_items from anon;
grant select, insert, update, delete on public.user_merchant_rules,
  public.import_batches to authenticated;
grant select, insert, update on public.import_items to authenticated;

-- The client only knows local category and space IDs. Resolve their remote
-- counterparts through the idempotent guest-migration source maps instead of
-- accepting arbitrary UUIDs from a device. This also makes a retry safe.
create or replace function public.sync_import_merchant_rules(
  p_installation_id text,
  p_rules jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  item record;
  target_space_id uuid;
  target_category_id uuid;
  synced_count integer := 0;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_installation_id), '') is null then raise exception 'installation required'; end if;
  if jsonb_typeof(p_rules) <> 'array' then raise exception 'rules must be an array'; end if;

  for item in select * from jsonb_to_recordset(p_rules) as x(
    local_id text,
    space_local_id text,
    category_local_id text,
    normalized_merchant text,
    confirmations integer,
    source text,
    last_used_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
  ) loop
    if nullif(btrim(item.space_local_id), '') is null
       or nullif(btrim(item.category_local_id), '') is null
       or nullif(btrim(item.normalized_merchant), '') is null
       or item.confirmations is null or item.confirmations < 1
       or item.source not in ('manual', 'import_correction', 'system') then
      raise exception 'invalid merchant rule payload';
    end if;

    select sls.space_id into target_space_id
      from public.space_local_sources sls
     where sls.user_id = current_user_id
       and sls.installation_id = p_installation_id
       and sls.local_id = item.space_local_id;
    if target_space_id is null or not public.is_active_space_member(target_space_id) then
      raise exception 'local space is not available to this user';
    end if;

    select c.id into target_category_id
      from public.categories c
     where c.space_id = target_space_id
       and c.source_installation_id = p_installation_id
       and c.source_local_id = item.category_local_id
       and c.is_archived = false;
    if target_category_id is null then
      raise exception 'local category is not available in its mapped space';
    end if;

    insert into public.user_merchant_rules (
      user_id, space_id, normalized_merchant, category_id, confirmations,
      source, last_used_at, created_at, updated_at
    ) values (
      current_user_id, target_space_id, btrim(item.normalized_merchant),
      target_category_id, item.confirmations, item.source, item.last_used_at,
      coalesce(item.created_at, now()), coalesce(item.updated_at, now())
    ) on conflict (user_id, space_id, normalized_merchant) do update
      set category_id = excluded.category_id,
          confirmations = greatest(
            user_merchant_rules.confirmations, excluded.confirmations
          ),
          source = excluded.source,
          last_used_at = excluded.last_used_at,
          updated_at = excluded.updated_at
      where user_merchant_rules.updated_at <= excluded.updated_at;
    synced_count := synced_count + 1;
  end loop;

  return synced_count;
end;
$$;

revoke all on function public.sync_import_merchant_rules(text, jsonb)
  from public, anon;
grant execute on function public.sync_import_merchant_rules(text, jsonb)
  to authenticated;

-- Batches use their local UUIDs as stable idempotency keys. Categories and
-- duplicate transactions are resolved from local source IDs on the server so
-- a client cannot choose foreign UUIDs in another space.
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
       or batch_item.source_type not in ('xls', 'xlsx', 'csv', 'tsv')
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

revoke all on function public.sync_import_batches(text, jsonb, jsonb)
  from public, anon;
grant execute on function public.sync_import_batches(text, jsonb, jsonb)
  to authenticated;

commit;
