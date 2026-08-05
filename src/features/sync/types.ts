import type { Space } from '@/features/spaces/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type GuestMigrationCategory = {
  id: string;
  spaceId: string;
  name: string;
  icon: string;
  colorToken: string;
  budgetMinor: number | null;
  isDefault: boolean;
  templateKey: string | null;
  sourceCategoryId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type GuestMigrationSeries = {
  id: string;
  spaceId: string;
  categoryId: string;
  type: 'expense' | 'income';
  amountMinor: number;
  currency: CurrencyCode;
  title: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startsOn: string;
  generatedOccurrences: number;
  nextOccurrenceOn: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type GuestMigrationTransaction = {
  id: string;
  spaceId: string;
  categoryId: string;
  type: 'expense' | 'income';
  amountMinor: number;
  currency: CurrencyCode;
  title: string;
  occurredOn: string;
  recurrence: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurrenceGroupId: string | null;
  recurrenceSeriesId: string | null;
  sourceTransactionId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type GuestMigrationPayload = {
  batchId: string;
  installationId: string;
  userId: string;
  spaces: readonly Space[];
  categories: readonly GuestMigrationCategory[];
  recurringSeries: readonly GuestMigrationSeries[];
  transactions: readonly GuestMigrationTransaction[];
};

export type GuestMigrationResult = {
  batchId: string;
  spaceCount: number;
  categoryCount: number;
  seriesCount: number;
  transactionCount: number;
};

export interface GuestMigrationGateway {
  migrateGuestData(
    payload: GuestMigrationPayload,
  ): Promise<GuestMigrationResult>;
}
