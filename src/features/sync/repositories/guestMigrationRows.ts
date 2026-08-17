import type {
  GuestMigrationMoneyAccount,
  GuestMigrationSeries,
  GuestMigrationTransaction,
} from '@/features/sync/types';

/**
 * Formas exactas de las filas de SQLite que viajan en la migración de
 * invitado. Viven aparte del repositorio para que este conserve solo el flujo
 * de preparación, confirmación y fallo del lote.
 */
export type SyncAccountRow = { user_id: string };
export type CategorySyncRow = {
  id: string;
  space_id: string;
  name: string;
  icon: string;
  color_token: string;
  budget_minor: number | null;
  is_default: number;
  template_key: string | null;
  source_category_id: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
export type MoneyAccountSyncRow = {
  id: string;
  space_id: string;
  name: string;
  kind: string;
  icon: string;
  color_token: string;
  currency: GuestMigrationMoneyAccount['currency'];
  opening_balance_minor: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
export type SeriesSyncRow = {
  id: string;
  space_id: string;
  category_id: string;
  money_account_id: string | null;
  type: GuestMigrationSeries['type'];
  amount_minor: number;
  currency: GuestMigrationSeries['currency'];
  title: string;
  frequency: GuestMigrationSeries['frequency'];
  starts_on: string;
  generated_occurrences: number;
  next_occurrence_on: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
export type TransactionSyncRow = {
  id: string;
  space_id: string;
  category_id: string;
  money_account_id: string | null;
  type: GuestMigrationTransaction['type'];
  amount_minor: number;
  currency: GuestMigrationTransaction['currency'];
  title: string;
  occurred_on: string;
  recurrence: GuestMigrationTransaction['recurrence'];
  recurrence_group_id: string | null;
  recurrence_series_id: string | null;
  source_transaction_id: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
