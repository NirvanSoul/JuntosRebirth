-- JUNTOSS_IMPORT_LEARNING_SCHEMA_TEMPLATE.sql
--
-- TEMPLATE ONLY. DO NOT RUN BLINDLY.
-- The implementation agent must inspect the real juntoss schema first.
--
-- Final target:
-- supabase/migrations/<timestamp>_import_learning_system.sql

begin;

-- ============================================================
-- 1. USER-SPECIFIC MERCHANT RULES
-- ============================================================

create table if not exists public.user_merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null,
  country_code text,
  normalized_merchant text not null,
  canonical_category_key text,
  category_id uuid,
  confirmations integer not null default 1 check (confirmations >= 1),
  source text not null default 'import_correction'
    check (source in ('manual', 'import_correction', 'system')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_merchant_rules_unique
    unique (user_id, space_id, normalized_merchant)
);

create index if not exists user_merchant_rules_lookup_idx
  on public.user_merchant_rules (user_id, space_id, normalized_merchant);

alter table public.user_merchant_rules enable row level security;

create policy "users_read_own_merchant_rules"
  on public.user_merchant_rules for select to authenticated
  using (user_id = auth.uid());

create policy "users_insert_own_merchant_rules"
  on public.user_merchant_rules for insert to authenticated
  with check (user_id = auth.uid());

create policy "users_update_own_merchant_rules"
  on public.user_merchant_rules for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users_delete_own_merchant_rules"
  on public.user_merchant_rules for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 2. IMPORT BATCHES
-- ============================================================

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null,
  source_type text not null
    check (source_type in ('xls', 'xlsx', 'csv', 'tsv')),
  file_hash text,
  source_profile text,
  status text not null default 'parsing'
    check (status in (
      'parsing',
      'mapping_required',
      'needs_review',
      'ready',
      'imported',
      'failed',
      'cancelled'
    )),
  total_items integer not null default 0,
  review_items integer not null default 0,
  duplicate_items integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists import_batches_user_idx
  on public.import_batches (user_id, created_at desc);

create index if not exists import_batches_space_idx
  on public.import_batches (space_id, created_at desc);

create unique index if not exists import_batches_user_file_hash_idx
  on public.import_batches (user_id, space_id, file_hash)
  where file_hash is not null;

alter table public.import_batches enable row level security;

create policy "users_read_own_import_batches"
  on public.import_batches for select to authenticated
  using (user_id = auth.uid());

create policy "users_insert_own_import_batches"
  on public.import_batches for insert to authenticated
  with check (user_id = auth.uid());

create policy "users_update_own_import_batches"
  on public.import_batches for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users_delete_own_import_batches"
  on public.import_batches for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 3. IMPORT ITEMS / PENDING REVIEW
-- ============================================================

create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_row integer,
  sheet_name text,
  raw_description text,
  normalized_merchant text,
  occurred_on date,
  amount_minor bigint,
  currency text,
  movement_type text check (movement_type in ('expense', 'income', 'unknown')),
  suggested_category_key text,
  final_category_id uuid,
  duplicate_status text not null default 'none'
    check (duplicate_status in ('none', 'exact', 'probable')),
  duplicate_transaction_id uuid,
  item_status text not null default 'pending'
    check (item_status in (
      'pending', 'ready', 'ignored', 'duplicate', 'imported', 'error'
    )),
  created_transaction_id uuid,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_items_batch_idx
  on public.import_items (batch_id);

alter table public.import_items enable row level security;

create policy "users_read_own_import_items"
  on public.import_items for select to authenticated
  using (
    exists (
      select 1 from public.import_batches b
      where b.id = import_items.batch_id
        and b.user_id = auth.uid()
    )
  );

create policy "users_insert_own_import_items"
  on public.import_items for insert to authenticated
  with check (
    exists (
      select 1 from public.import_batches b
      where b.id = import_items.batch_id
        and b.user_id = auth.uid()
    )
  );

create policy "users_update_own_import_items"
  on public.import_items for update to authenticated
  using (
    exists (
      select 1 from public.import_batches b
      where b.id = import_items.batch_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.import_batches b
      where b.id = import_items.batch_id
        and b.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. PRIVATE COMMUNITY VOTES
-- ============================================================

create table if not exists public.merchant_feedback_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text,
  normalized_merchant text not null,
  canonical_category_key text not null,
  confirmations integer not null default 1 check (confirmations >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_feedback_votes_unique_user_merchant
    unique (user_id, country_code, normalized_merchant)
);

create index if not exists merchant_feedback_votes_aggregate_idx
  on public.merchant_feedback_votes
  (country_code, normalized_merchant, canonical_category_key);

alter table public.merchant_feedback_votes enable row level security;

-- Prefer RPC-only writes and no client SELECT policy.

-- ============================================================
-- 5. COMMUNITY AGGREGATES
-- ============================================================

create table if not exists public.merchant_feedback_aggregates (
  country_code text,
  normalized_merchant text not null,
  canonical_category_key text not null,
  unique_users integer not null default 0 check (unique_users >= 0),
  total_confirmations bigint not null default 0 check (total_confirmations >= 0),
  updated_at timestamptz not null default now(),
  primary key (country_code, normalized_merchant, canonical_category_key)
);

alter table public.merchant_feedback_aggregates enable row level security;

-- No regular client write policy.

-- ============================================================
-- 6. GLOBAL RULE CANDIDATES
-- ============================================================

create table if not exists public.global_rule_candidates (
  id uuid primary key default gen_random_uuid(),
  country_code text,
  normalized_merchant text not null,
  canonical_category_key text not null,
  unique_users integer not null,
  consensus numeric(5,4) not null check (consensus >= 0 and consensus <= 1),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  first_qualified_at timestamptz not null default now(),
  last_qualified_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_notes text,
  unique (country_code, normalized_merchant, canonical_category_key)
);

alter table public.global_rule_candidates enable row level security;

-- No regular client policies.

-- ============================================================
-- 7. RPC BLUEPRINT
-- ============================================================
--
-- STRONGLY RECOMMENDED FINAL SIGNATURE:
--
-- record_merchant_feedback(
--   p_import_item_id uuid,
--   p_canonical_category_key text
-- )
--
-- The server should derive merchant/country from an import item owned by auth.uid().
-- This prevents arbitrary poisoning.
--
-- If a simpler signature is temporarily used, it must still:
--   1. validate auth.uid()
--   2. upsert one current vote per user+merchant
--   3. decrement old aggregate on category change
--   4. increment new aggregate
--   5. calculate consensus
--   6. create candidate only after threshold
--   7. NEVER update production global rules automatically
--
-- Supabase guidance for SECURITY DEFINER functions should be followed,
-- including an explicit restricted search_path.

-- ============================================================
-- 8. REQUIRED BEFORE PRODUCTION
-- ============================================================
--
-- [ ] Add actual FK to spaces table.
-- [ ] Add actual FK to categories table.
-- [ ] Add actual FK to transactions table.
-- [ ] Reuse current membership authorization helpers.
-- [ ] Reuse current updated_at trigger helper.
-- [ ] Implement record_merchant_feedback using import_item ownership.
-- [ ] Add canonical category validation.
-- [ ] Add rate/abuse controls.
-- [ ] Add concurrency tests.
-- [ ] Run Supabase Security Advisor.
-- [ ] Run Supabase Performance Advisor.
-- [ ] Verify no aggregate table leaks individual behavior.

commit;
