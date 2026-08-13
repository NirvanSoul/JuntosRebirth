-- Sincroniza un lote local de un espacio Juntos. La función es la única vía
-- de escritura colaborativa: comprueba la membresía antes de tocar datos y
-- resuelve las dependencias categoría/serie dentro de la misma transacción.

create or replace function public.sync_couple_space_data(
  p_space_id uuid,
  p_installation_id text,
  p_categories jsonb,
  p_recurring_series jsonb,
  p_transactions jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  item record;
  remote_category_id uuid;
  remote_series_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if nullif(btrim(p_installation_id), '') is null then
    raise exception 'installation required';
  end if;
  if jsonb_typeof(p_categories) <> 'array'
     or jsonb_typeof(p_recurring_series) <> 'array'
     or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'couple sync payload must contain arrays';
  end if;
  if not exists (
    select 1 from public.spaces
     where id = p_space_id
       and type = 'couple'
       and archived_at is null
       and public.is_active_space_member(id)
  ) then
    raise exception 'couple_space_membership_required';
  end if;

  for item in select * from jsonb_to_recordset(p_categories) as x(
    id text, "remoteId" text, name text, icon text, "colorToken" text,
    "budgetMinor" bigint, "isDefault" boolean, "templateKey" text,
    "isArchived" boolean, "createdAt" timestamptz, "updatedAt" timestamptz
  ) loop
    remote_category_id := null;
    select id into remote_category_id from public.categories
     where id::text = item."remoteId" and space_id = p_space_id;
    if remote_category_id is null then
      select id into remote_category_id from public.categories
       where space_id = p_space_id
         and source_installation_id = p_installation_id
         and source_local_id = item.id;
    end if;

    if remote_category_id is null then
      insert into public.categories(
        space_id, name, icon, color_token, budget_amount_minor, created_by,
        is_default, template_key, source_installation_id, source_local_id,
        is_archived, created_at, updated_at, archived_at
      ) values (
        p_space_id, item.name, item.icon, item."colorToken", item."budgetMinor",
        current_user_id, coalesce(item."isDefault", false), item."templateKey",
        p_installation_id, item.id, coalesce(item."isArchived", false),
        coalesce(item."createdAt", now()), coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      );
    else
      update public.categories set
        name = item.name, icon = item.icon, color_token = item."colorToken",
        budget_amount_minor = item."budgetMinor",
        is_default = coalesce(item."isDefault", false),
        template_key = item."templateKey",
        is_archived = coalesce(item."isArchived", false),
        updated_at = coalesce(item."updatedAt", now()),
        archived_at = case when coalesce(item."isArchived", false)
          then coalesce(item."updatedAt", now()) else null end
      where id = remote_category_id;
    end if;
  end loop;

  for item in select * from jsonb_to_recordset(p_recurring_series) as x(
    id text, "remoteId" text, "categoryId" text, type text,
    "amountMinor" bigint, currency text, title text, frequency text,
    "startsOn" date, "generatedOccurrences" integer,
    "nextOccurrenceOn" date, "isArchived" boolean,
    "createdAt" timestamptz, "updatedAt" timestamptz
  ) loop
    select id into remote_category_id from public.categories
     where id::text = item."categoryId" and space_id = p_space_id;
    if remote_category_id is null then
      select id into remote_category_id from public.categories
       where space_id = p_space_id
         and source_installation_id = p_installation_id
         and source_local_id = item."categoryId";
    end if;
    if remote_category_id is null then
      raise exception 'couple_sync_category_not_found';
    end if;

    remote_series_id := null;
    select id into remote_series_id from public.recurring_transaction_series
     where id::text = item."remoteId" and space_id = p_space_id;
    if remote_series_id is null then
      select id into remote_series_id from public.recurring_transaction_series
       where space_id = p_space_id
         and source_installation_id = p_installation_id
         and source_local_id = item.id;
    end if;
    if remote_series_id is null then
      insert into public.recurring_transaction_series(
        space_id, category_id, created_by, type, amount_minor, currency, title,
        frequency, starts_on, generated_occurrences, next_occurrence_on,
        source_installation_id, source_local_id, is_archived, created_at,
        updated_at, archived_at
      ) values (
        p_space_id, remote_category_id, current_user_id, item.type,
        item."amountMinor", item.currency, item.title, item.frequency,
        item."startsOn", item."generatedOccurrences", item."nextOccurrenceOn",
        p_installation_id, item.id, coalesce(item."isArchived", false),
        coalesce(item."createdAt", now()), coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      );
    else
      update public.recurring_transaction_series set
        category_id = remote_category_id, type = item.type,
        amount_minor = item."amountMinor", currency = item.currency,
        title = item.title, frequency = item.frequency,
        starts_on = item."startsOn",
        generated_occurrences = item."generatedOccurrences",
        next_occurrence_on = item."nextOccurrenceOn",
        is_archived = coalesce(item."isArchived", false),
        updated_at = coalesce(item."updatedAt", now()),
        archived_at = case when coalesce(item."isArchived", false)
          then coalesce(item."updatedAt", now()) else null end
      where id = remote_series_id;
    end if;
  end loop;

  for item in select * from jsonb_to_recordset(p_transactions) as x(
    id text, "remoteId" text, "categoryId" text, type text,
    "amountMinor" bigint, currency text, title text, "occurredOn" date,
    recurrence text, "recurrenceGroupId" text, "recurrenceSeriesId" text,
    "sourceTransactionId" text, "isArchived" boolean,
    "createdAt" timestamptz, "updatedAt" timestamptz
  ) loop
    select id into remote_category_id from public.categories
     where id::text = item."categoryId" and space_id = p_space_id;
    if remote_category_id is null then
      select id into remote_category_id from public.categories
       where space_id = p_space_id
         and source_installation_id = p_installation_id
         and source_local_id = item."categoryId";
    end if;
    if remote_category_id is null then
      raise exception 'couple_sync_category_not_found';
    end if;

    remote_series_id := null;
    if item."recurrenceSeriesId" is not null then
      select id into remote_series_id from public.recurring_transaction_series
       where id::text = item."recurrenceSeriesId" and space_id = p_space_id;
      if remote_series_id is null then
        select id into remote_series_id from public.recurring_transaction_series
         where space_id = p_space_id
           and source_installation_id = p_installation_id
           and source_local_id = item."recurrenceSeriesId";
      end if;
      if remote_series_id is null then
        raise exception 'couple_sync_series_not_found';
      end if;
    end if;

    if exists (
      select 1 from public.transactions
       where id::text = item."remoteId" and space_id = p_space_id
    ) then
      update public.transactions set
        category_id = remote_category_id, type = item.type,
        amount_minor = item."amountMinor", currency = item.currency,
        title = item.title, occurred_on = item."occurredOn",
        recurrence = item.recurrence,
        recurrence_group_id = item."recurrenceGroupId",
        recurrence_series_id = remote_series_id,
        is_archived = coalesce(item."isArchived", false),
        updated_at = coalesce(item."updatedAt", now()),
        archived_at = case when coalesce(item."isArchived", false)
          then coalesce(item."updatedAt", now()) else null end
      where id::text = item."remoteId" and space_id = p_space_id;
    else
      insert into public.transactions(
        space_id, category_id, created_by, type, amount_minor, currency, title,
        occurred_on, recurrence, recurrence_series_id, recurrence_group_id,
        source_installation_id, source_local_id, source_local_transaction_id,
        is_archived, created_at, updated_at, archived_at
      ) values (
        p_space_id, remote_category_id, current_user_id, item.type,
        item."amountMinor", item.currency, item.title, item."occurredOn",
        item.recurrence, remote_series_id, item."recurrenceGroupId",
        p_installation_id, item.id, item."sourceTransactionId",
        coalesce(item."isArchived", false), coalesce(item."createdAt", now()),
        coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      ) on conflict (space_id, source_installation_id, source_local_id) do update set
        category_id = excluded.category_id, type = excluded.type,
        amount_minor = excluded.amount_minor, currency = excluded.currency,
        title = excluded.title, occurred_on = excluded.occurred_on,
        recurrence = excluded.recurrence,
        recurrence_group_id = excluded.recurrence_group_id,
        recurrence_series_id = excluded.recurrence_series_id,
        source_local_transaction_id = excluded.source_local_transaction_id,
        is_archived = excluded.is_archived, updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    end if;
  end loop;
end;
$$;

revoke all on function public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb) to authenticated;
