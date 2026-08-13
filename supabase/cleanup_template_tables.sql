-- Run this FIRST in the Supabase SQL editor, then run migrations 10, 11, 12, 13
-- in order. It removes the tables that got created by
-- 09_JUNTOSS_IMPORT_LEARNING_SCHEMA_TEMPLATE.sql (a template file that was
-- mistakenly executed against the live database instead of only used as a
-- reference). That template's tables are missing real FKs to
-- spaces/categories/transactions and use weaker RLS policies than the real
-- migrations, so they need to be replaced rather than kept.
--
-- Safe to run as long as no real import/merchant-rule data has been created
-- yet (this app is still in early alpha).

begin;

drop table if exists public.import_items cascade;
drop table if exists public.import_batches cascade;
drop table if exists public.user_merchant_rules cascade;
drop table if exists public.global_rule_candidates cascade;
drop table if exists public.merchant_feedback_aggregates cascade;
drop table if exists public.merchant_feedback_votes cascade;

commit;
