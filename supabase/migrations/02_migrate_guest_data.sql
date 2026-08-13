create or replace function public.migrate_guest_data(
  p_batch_id uuid,
  p_installation_id text,
  p_spaces jsonb,
  p_categories jsonb,
  p_recurring_series jsonb,
  p_transactions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  item record;
  remote_space_id uuid;
  remote_category_id uuid;
  remote_series_id uuid;
  existing_result jsonb;
  existing_batch_user_id uuid;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_installation_id), '') is null then raise exception 'installation required'; end if;
  if jsonb_typeof(p_spaces) <> 'array'
     or jsonb_typeof(p_categories) <> 'array'
     or jsonb_typeof(p_recurring_series) <> 'array'
     or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'migration payload must contain arrays';
  end if;

  select jsonb_build_object(
    'batchId', id,
    'spaceCount', space_count,
    'categoryCount', category_count,
    'seriesCount', series_count,
    'transactionCount', transaction_count
  ) into existing_result
  from public.guest_migration_batches
  where id = p_batch_id and user_id = current_user_id and status = 'completed';
  if existing_result is not null then return existing_result; end if;

  select user_id into existing_batch_user_id
    from public.guest_migration_batches where id = p_batch_id;
  if existing_batch_user_id is not null and existing_batch_user_id <> current_user_id then
    raise exception 'migration batch belongs to another user';
  end if;

  insert into public.guest_migration_batches(id, user_id, installation_id, status)
  values (p_batch_id, current_user_id, p_installation_id, 'processing')
  on conflict (id) do nothing;

  for item in select * from jsonb_to_recordset(p_spaces)
    as x(id text, name text, type text)
  loop
    remote_space_id := null;
    select space_id into remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item.id;
    if remote_space_id is null and item.type = 'personal' then
      select id into remote_space_id from public.spaces
       where created_by = current_user_id and type = 'personal' and archived_at is null;
    end if;
    if remote_space_id is not null then
      update public.spaces set
        name = item.name, updated_at = now()
      where id = remote_space_id;
    else
      insert into public.spaces(
        name, type, currency, created_by
      ) values (
        item.name, item.type, 'EUR', current_user_id
      )
      returning id into remote_space_id;
    end if;

    insert into public.space_local_sources(space_id, user_id, installation_id, local_id)
    values (remote_space_id, current_user_id, p_installation_id, item.id)
    on conflict (user_id, installation_id, local_id) do update
      set space_id = excluded.space_id;

    insert into public.space_members(space_id, user_id, role, status)
    values (remote_space_id, current_user_id, 'owner', 'active')
    on conflict (space_id, user_id) do update
      set role = 'owner', status = 'active', left_at = null, updated_at = now();
  end loop;

  for item in select * from jsonb_to_recordset(p_categories) as x(
    id text, "spaceId" text, name text, icon text, "colorToken" text,
    "budgetMinor" bigint, "isDefault" boolean, "templateKey" text,
    "sourceCategoryId" text, "isArchived" boolean, "createdAt" timestamptz,
    "updatedAt" timestamptz, "archivedAt" timestamptz
  ) loop
    select space_id into strict remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item."spaceId";
    insert into public.categories(
      space_id, name, icon, color_token, budget_amount_minor, created_by,
      is_default, template_key, source_installation_id, source_local_id,
      source_local_category_id, is_archived, created_at, updated_at, archived_at
    ) values (
      remote_space_id, item.name, item.icon, item."colorToken", item."budgetMinor",
      current_user_id, item."isDefault", item."templateKey", p_installation_id,
      item.id, item."sourceCategoryId", item."isArchived", item."createdAt",
      item."updatedAt", item."archivedAt"
    ) on conflict (space_id, source_installation_id, source_local_id) do update set
      name = excluded.name, icon = excluded.icon, color_token = excluded.color_token,
      budget_amount_minor = excluded.budget_amount_minor,
      is_default = excluded.is_default, template_key = excluded.template_key,
      source_local_category_id = excluded.source_local_category_id,
      is_archived = excluded.is_archived, updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  end loop;

  for item in select * from jsonb_to_recordset(p_recurring_series) as x(
    id text, "spaceId" text, "categoryId" text, type text, "amountMinor" bigint,
    currency text, title text, frequency text, "startsOn" date,
    "generatedOccurrences" integer, "nextOccurrenceOn" date,
    "isArchived" boolean, "createdAt" timestamptz, "updatedAt" timestamptz,
    "archivedAt" timestamptz
  ) loop
    select space_id into strict remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item."spaceId";
    select id into strict remote_category_id from public.categories
     where space_id = remote_space_id and source_installation_id = p_installation_id
       and source_local_id = item."categoryId";
    insert into public.recurring_transaction_series(
      space_id, category_id, created_by, type, amount_minor, currency, title,
      frequency, starts_on, generated_occurrences, next_occurrence_on,
      source_installation_id, source_local_id, is_archived, created_at,
      updated_at, archived_at
    ) values (
      remote_space_id, remote_category_id, current_user_id, item.type,
      item."amountMinor", item.currency, item.title, item.frequency,
      item."startsOn", item."generatedOccurrences", item."nextOccurrenceOn",
      p_installation_id, item.id, item."isArchived", item."createdAt",
      item."updatedAt", item."archivedAt"
    ) on conflict (space_id, source_installation_id, source_local_id) do update set
      category_id = excluded.category_id, type = excluded.type,
      amount_minor = excluded.amount_minor, currency = excluded.currency,
      title = excluded.title, frequency = excluded.frequency,
      starts_on = excluded.starts_on,
      generated_occurrences = excluded.generated_occurrences,
      next_occurrence_on = excluded.next_occurrence_on,
      is_archived = excluded.is_archived, updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  end loop;

  for item in select * from jsonb_to_recordset(p_transactions) as x(
    id text, "spaceId" text, "categoryId" text, type text, "amountMinor" bigint,
    currency text, title text, "occurredOn" date, recurrence text,
    "recurrenceGroupId" text, "recurrenceSeriesId" text,
    "sourceTransactionId" text, "isArchived" boolean,
    "createdAt" timestamptz, "updatedAt" timestamptz, "archivedAt" timestamptz
  ) loop
    select space_id into strict remote_space_id from public.space_local_sources
     where user_id = current_user_id and installation_id = p_installation_id
       and local_id = item."spaceId";
    select id into strict remote_category_id from public.categories
     where space_id = remote_space_id and source_installation_id = p_installation_id
       and source_local_id = item."categoryId";
    remote_series_id := null;
    if item."recurrenceSeriesId" is not null then
      select id into strict remote_series_id from public.recurring_transaction_series
       where space_id = remote_space_id and source_installation_id = p_installation_id
         and source_local_id = item."recurrenceSeriesId";
    end if;
    insert into public.transactions(
      space_id, category_id, created_by, type, amount_minor, currency, title,
      occurred_on, recurrence, recurrence_series_id, recurrence_group_id,
      source_installation_id, source_local_id, source_local_transaction_id,
      is_archived, created_at, updated_at, archived_at
    ) values (
      remote_space_id, remote_category_id, current_user_id, item.type,
      item."amountMinor", item.currency, item.title, item."occurredOn",
      item.recurrence, remote_series_id, item."recurrenceGroupId",
      p_installation_id, item.id, item."sourceTransactionId", item."isArchived",
      item."createdAt", item."updatedAt", item."archivedAt"
    ) on conflict (space_id, source_installation_id, source_local_id) do update set
      category_id = excluded.category_id, type = excluded.type,
      amount_minor = excluded.amount_minor, currency = excluded.currency,
      title = excluded.title, occurred_on = excluded.occurred_on,
      recurrence = excluded.recurrence,
      recurrence_series_id = excluded.recurrence_series_id,
      recurrence_group_id = excluded.recurrence_group_id,
      source_local_transaction_id = excluded.source_local_transaction_id,
      is_archived = excluded.is_archived, updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  end loop;

  update public.guest_migration_batches set
    status = 'completed', space_count = jsonb_array_length(p_spaces),
    category_count = jsonb_array_length(p_categories),
    series_count = jsonb_array_length(p_recurring_series),
    transaction_count = jsonb_array_length(p_transactions), completed_at = now()
  where id = p_batch_id and user_id = current_user_id;

  return jsonb_build_object(
    'batchId', p_batch_id,
    'spaceCount', jsonb_array_length(p_spaces),
    'categoryCount', jsonb_array_length(p_categories),
    'seriesCount', jsonb_array_length(p_recurring_series),
    'transactionCount', jsonb_array_length(p_transactions)
  );
end;
$$;

revoke all on function public.migrate_guest_data(uuid, text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.migrate_guest_data(uuid, text, jsonb, jsonb, jsonb, jsonb) to authenticated;
