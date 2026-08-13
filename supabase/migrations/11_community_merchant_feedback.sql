-- STEP 9 — Community learning. Votes are private; only the server updates
-- aggregates and merely proposes candidates for manual review.
begin;

create table public.merchant_feedback_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  normalized_merchant text not null
    check (length(normalized_merchant) between 3 and 160),
  canonical_category_key text not null
    check (canonical_category_key ~ '^[a-z0-9_]{2,64}$'),
  confirmations integer not null default 1 check (confirmations >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, country_code, normalized_merchant)
);

create table public.merchant_feedback_aggregates (
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  normalized_merchant text not null
    check (length(normalized_merchant) between 3 and 160),
  canonical_category_key text not null
    check (canonical_category_key ~ '^[a-z0-9_]{2,64}$'),
  unique_users integer not null check (unique_users > 0),
  total_confirmations integer not null check (total_confirmations >= unique_users),
  updated_at timestamptz not null default now(),
  primary key (country_code, normalized_merchant, canonical_category_key)
);

create table public.global_rule_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  normalized_merchant text not null,
  canonical_category_key text not null,
  unique_users integer not null check (unique_users >= 20),
  consensus numeric(5,4) not null check (consensus >= 0 and consensus <= 1),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, normalized_merchant, canonical_category_key)
);

create index merchant_feedback_aggregates_lookup_idx
  on public.merchant_feedback_aggregates (country_code, normalized_merchant);

alter table public.merchant_feedback_votes enable row level security;
alter table public.merchant_feedback_aggregates enable row level security;
alter table public.global_rule_candidates enable row level security;

create policy merchant_feedback_votes_select_own on public.merchant_feedback_votes
  for select to authenticated using (user_id = (select auth.uid()));

-- No table mutations for clients: the RPC below verifies ownership of a real
-- import item and updates all three tables atomically.
revoke all on public.merchant_feedback_votes,
  public.merchant_feedback_aggregates, public.global_rule_candidates from anon, authenticated;
grant select on public.merchant_feedback_votes to authenticated;

create or replace function public.record_merchant_feedback(
  p_import_item_id uuid,
  p_canonical_category_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  merchant text;
  country text;
  previous_category text;
  previous_confirmations integer;
  current_users integer;
  total_users integer;
  current_consensus numeric(5,4);
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if p_import_item_id is null
     or p_canonical_category_key !~ '^[a-z0-9_]{2,64}$' then
    raise exception 'invalid community feedback';
  end if;

  select i.normalized_merchant into merchant
    from public.import_items i
    join public.import_batches b on b.id = i.batch_id and b.space_id = i.space_id
   where i.id = p_import_item_id
     and b.user_id = current_user_id
     and i.final_category_id is not null;
  if merchant is null or length(btrim(merchant)) < 3 then
    raise exception 'import item is not eligible for community feedback';
  end if;

  select coalesce(upper(right(locale, 2)), 'ZZ') into country
    from public.profiles where id = current_user_id;
  country := coalesce(country, 'ZZ');

  select canonical_category_key, confirmations
    into previous_category, previous_confirmations
    from public.merchant_feedback_votes
   where user_id = current_user_id
     and country_code = country
     and normalized_merchant = merchant
   for update;

  if previous_category is null then
    insert into public.merchant_feedback_votes (
      user_id, country_code, normalized_merchant, canonical_category_key,
      confirmations
    ) values (
      current_user_id, country, merchant, p_canonical_category_key, 1
    );
    insert into public.merchant_feedback_aggregates (
      country_code, normalized_merchant, canonical_category_key,
      unique_users, total_confirmations
    ) values (country, merchant, p_canonical_category_key, 1, 1)
    on conflict (country_code, normalized_merchant, canonical_category_key)
      do update set unique_users = merchant_feedback_aggregates.unique_users + 1,
                    total_confirmations = merchant_feedback_aggregates.total_confirmations + 1,
                    updated_at = now();
  elsif previous_category = p_canonical_category_key then
    update public.merchant_feedback_votes
       set confirmations = confirmations + 1, updated_at = now()
     where user_id = current_user_id and country_code = country
       and normalized_merchant = merchant;
    update public.merchant_feedback_aggregates
       set total_confirmations = total_confirmations + 1, updated_at = now()
     where country_code = country and normalized_merchant = merchant
       and canonical_category_key = p_canonical_category_key;
  else
    update public.merchant_feedback_aggregates
       set unique_users = unique_users - 1,
           total_confirmations = total_confirmations - previous_confirmations,
           updated_at = now()
     where country_code = country and normalized_merchant = merchant
       and canonical_category_key = previous_category;
    delete from public.merchant_feedback_aggregates
     where country_code = country and normalized_merchant = merchant
       and canonical_category_key = previous_category and unique_users <= 0;
    update public.merchant_feedback_votes
       set canonical_category_key = p_canonical_category_key,
           confirmations = 1, updated_at = now()
     where user_id = current_user_id and country_code = country
       and normalized_merchant = merchant;
    insert into public.merchant_feedback_aggregates (
      country_code, normalized_merchant, canonical_category_key,
      unique_users, total_confirmations
    ) values (country, merchant, p_canonical_category_key, 1, 1)
    on conflict (country_code, normalized_merchant, canonical_category_key)
      do update set unique_users = merchant_feedback_aggregates.unique_users + 1,
                    total_confirmations = merchant_feedback_aggregates.total_confirmations + 1,
                    updated_at = now();
  end if;

  select a.unique_users, sum(all_votes.unique_users)
    into current_users, total_users
    from public.merchant_feedback_aggregates a
    join public.merchant_feedback_aggregates all_votes
      on all_votes.country_code = a.country_code
     and all_votes.normalized_merchant = a.normalized_merchant
   where a.country_code = country and a.normalized_merchant = merchant
     and a.canonical_category_key = p_canonical_category_key
   group by a.unique_users;
  current_consensus := current_users::numeric / nullif(total_users, 0);

  if current_users >= 20 and current_consensus >= 0.85 then
    insert into public.global_rule_candidates (
      country_code, normalized_merchant, canonical_category_key,
      unique_users, consensus
    ) values (
      country, merchant, p_canonical_category_key,
      current_users, current_consensus
    ) on conflict (country_code, normalized_merchant, canonical_category_key)
      do update set unique_users = excluded.unique_users,
                    consensus = excluded.consensus,
                    updated_at = now()
      where global_rule_candidates.status = 'pending';
  end if;
end;
$$;

revoke all on function public.record_merchant_feedback(uuid, text) from public, anon;
grant execute on function public.record_merchant_feedback(uuid, text) to authenticated;

commit;
