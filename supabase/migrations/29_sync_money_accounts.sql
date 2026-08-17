-- Lleva las cuentas al circuito compartido: la sincronización de un espacio
-- Juntos, la publicación de realtime y el borrado de cuenta de usuario.
--
-- `sync_couple_space_data` gana el parámetro `p_money_accounts` y resuelve la
-- cuenta de cada movimiento y de cada serie igual que ya resuelve la
-- categoría: primero por id remoto y, si no aparece, por el par
-- (instalación, id local). Las cuentas se procesan antes que las series y los
-- movimientos porque ambos las referencian.

create or replace function public.sync_couple_space_data(
  p_space_id uuid,
  p_installation_id text,
  p_categories jsonb,
  p_money_accounts jsonb,
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
  remote_money_account_id uuid;
  remote_series_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if nullif(btrim(p_installation_id), '') is null then
    raise exception 'installation required';
  end if;
  if jsonb_typeof(p_categories) <> 'array'
     or jsonb_typeof(p_money_accounts) <> 'array'
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
        id, space_id, name, icon, color_token, budget_amount_minor, created_by,
        is_default, template_key, source_installation_id, source_local_id,
        is_archived, created_at, updated_at, archived_at
      ) values (
        case when item.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then item.id::uuid else extensions.gen_random_uuid() end,
        p_space_id, item.name, item.icon, item."colorToken", item."budgetMinor",
        current_user_id, coalesce(item."isDefault", false), item."templateKey",
        p_installation_id, item.id, coalesce(item."isArchived", false),
        coalesce(item."createdAt", now()), coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      ) returning id into remote_category_id;
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

  for item in select * from jsonb_to_recordset(p_money_accounts) as x(
    id text, "remoteId" text, name text, kind text, icon text,
    "colorToken" text, currency text, "openingBalanceMinor" bigint,
    "isArchived" boolean, "createdAt" timestamptz, "updatedAt" timestamptz
  ) loop
    remote_money_account_id := null;
    select id into remote_money_account_id from public.money_accounts
     where id::text = item."remoteId" and space_id = p_space_id;
    if remote_money_account_id is null then
      select id into remote_money_account_id from public.money_accounts
       where space_id = p_space_id
         and source_installation_id = p_installation_id
         and source_local_id = item.id;
    end if;

    if remote_money_account_id is null then
      insert into public.money_accounts(
        id, space_id, name, kind, icon, color_token, currency,
        opening_balance_minor, created_by, source_installation_id,
        source_local_id, is_archived, created_at, updated_at, archived_at
      ) values (
        case when item.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then item.id::uuid else extensions.gen_random_uuid() end,
        p_space_id, item.name, item.kind, item.icon, item."colorToken",
        item.currency, coalesce(item."openingBalanceMinor", 0),
        current_user_id, p_installation_id, item.id,
        coalesce(item."isArchived", false),
        coalesce(item."createdAt", now()), coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      ) returning id into remote_money_account_id;
    else
      update public.money_accounts set
        name = item.name, kind = item.kind, icon = item.icon,
        color_token = item."colorToken", currency = item.currency,
        opening_balance_minor = coalesce(item."openingBalanceMinor", 0),
        is_archived = coalesce(item."isArchived", false),
        updated_at = coalesce(item."updatedAt", now()),
        archived_at = case when coalesce(item."isArchived", false)
          then coalesce(item."updatedAt", now()) else null end
      where id = remote_money_account_id;
    end if;
  end loop;

  for item in select * from jsonb_to_recordset(p_recurring_series) as x(
    id text, "remoteId" text, "categoryId" text, "moneyAccountId" text,
    type text,
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

    remote_money_account_id := null;
    if item."moneyAccountId" is not null then
      select id into remote_money_account_id from public.money_accounts
       where id::text = item."moneyAccountId" and space_id = p_space_id;
      if remote_money_account_id is null then
        select id into remote_money_account_id from public.money_accounts
         where space_id = p_space_id
           and source_installation_id = p_installation_id
           and source_local_id = item."moneyAccountId";
      end if;
      if remote_money_account_id is null then
        raise exception 'couple_sync_money_account_not_found';
      end if;
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
        id, space_id, category_id, money_account_id, created_by, type,
        amount_minor, currency, title,
        frequency, starts_on, generated_occurrences, next_occurrence_on,
        source_installation_id, source_local_id, is_archived, created_at,
        updated_at, archived_at
      ) values (
        case when item.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then item.id::uuid else extensions.gen_random_uuid() end,
        p_space_id, remote_category_id, remote_money_account_id,
        current_user_id, item.type,
        item."amountMinor", item.currency, item.title, item.frequency,
        item."startsOn", item."generatedOccurrences", item."nextOccurrenceOn",
        p_installation_id, item.id, coalesce(item."isArchived", false),
        coalesce(item."createdAt", now()), coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      ) returning id into remote_series_id;
    else
      update public.recurring_transaction_series set
        category_id = remote_category_id,
        money_account_id = remote_money_account_id, type = item.type,
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
    id text, "remoteId" text, "categoryId" text, "moneyAccountId" text,
    type text,
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

    remote_money_account_id := null;
    if item."moneyAccountId" is not null then
      select id into remote_money_account_id from public.money_accounts
       where id::text = item."moneyAccountId" and space_id = p_space_id;
      if remote_money_account_id is null then
        select id into remote_money_account_id from public.money_accounts
         where space_id = p_space_id
           and source_installation_id = p_installation_id
           and source_local_id = item."moneyAccountId";
      end if;
      if remote_money_account_id is null then
        raise exception 'couple_sync_money_account_not_found';
      end if;
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
        category_id = remote_category_id,
        money_account_id = remote_money_account_id, type = item.type,
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
        id, space_id, category_id, money_account_id, created_by, type,
        amount_minor, currency, title,
        occurred_on, recurrence, recurrence_series_id, recurrence_group_id,
        source_installation_id, source_local_id, source_local_transaction_id,
        is_archived, created_at, updated_at, archived_at
      ) values (
        case when item.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then item.id::uuid else extensions.gen_random_uuid() end,
        p_space_id, remote_category_id, remote_money_account_id,
        current_user_id, item.type,
        item."amountMinor", item.currency, item.title, item."occurredOn",
        item.recurrence, remote_series_id, item."recurrenceGroupId",
        p_installation_id, item.id, item."sourceTransactionId",
        coalesce(item."isArchived", false), coalesce(item."createdAt", now()),
        coalesce(item."updatedAt", now()),
        case when coalesce(item."isArchived", false) then coalesce(item."updatedAt", now()) else null end
      ) on conflict (space_id, source_installation_id, source_local_id) do update set
        category_id = excluded.category_id,
        money_account_id = excluded.money_account_id, type = excluded.type,
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

-- La firma anterior se retira: dejar las dos conviviendo haría ambigua la
-- llamada desde PostgREST, que resuelve por nombre de parámetro.
drop function if exists public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb);

revoke all on function public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.sync_couple_space_data(uuid, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Realtime: el otro miembro debe enterarse de una cuenta nueva igual que se
-- entera de una categoría. El RPC sigue siendo la única vía de escritura;
-- Realtime solo dispara una relectura que RLS vuelve a autorizar.
alter table public.money_accounts replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'supabase_realtime publication is required';
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'money_accounts'
  ) then
    alter publication supabase_realtime add table public.money_accounts;
  end if;
end;
$$;

-- Borrado de cuenta de usuario: `money_accounts.created_by` es
-- `on delete set null`, así que no bloquea el borrado, pero las filas de un
-- espacio que se elimina entero sí hay que retirarlas antes que el espacio.
-- Se parte de la versión vigente (migración 25, que añadió la limpieza del
-- bucket de avatares) y solo se añade el `delete` de las cuentas, después de
-- movimientos y series, que son quienes las referencian.
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
    delete from public.money_accounts where space_id = solo_space_id;
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

  -- La foto de perfil vive en Storage, fuera del alcance de cualquier clave
  -- ajena: si no se borra aquí, sobrevive a la cuenta.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = current_user_id::text;

  return jsonb_build_object(
    'deletedSpaceCount', deleted_space_count,
    'leftSpaceCount', left_space_count
  );
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
