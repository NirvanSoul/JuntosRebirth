import type { TransactionType } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type ImportSourceExtension = 'xlsx' | 'xls' | 'csv';

export type ImportErrorCode =
  | 'unsupported_file'
  | 'too_large'
  | 'corrupt_file'
  | 'no_transactions_found'
  | 'column_mapping_required'
  | 'currency_unknown'
  | 'too_many_rows'
  | 'commit_failed';

export type ImportIssueCode =
  | 'ambiguous_date'
  | 'unparseable_date'
  | 'unparseable_amount'
  | 'unknown_type'
  | 'unknown_category'
  | 'unknown_currency'
  | 'invalid_fraction_for_currency'
  | 'probable_duplicate';

export type ImportIssue = {
  code: ImportIssueCode;
  message: string;
};

export type ImportDuplicateStatus = 'none' | 'exact' | 'probable';

/**
 * Fila cruda ya normalizada, todavía no convertida a un movimiento real.
 * Nunca se guarda en `transactions`: es el estado intermedio que revisa el
 * usuario antes de confirmar la importación (Bible §30).
 */
export type ImportedTransactionCandidate = {
  id: string;
  sourceRowNumber: number;

  rawDescription: string;
  normalizedMerchant: string;
  displayTitle: string;

  occurredOn: string | null;

  amountMinor: number | null;
  currency: CurrencyCode | null;

  type: TransactionType | 'unknown';

  suggestedCategoryId: string | null;
  categoryId: string | null;

  duplicateStatus: ImportDuplicateStatus;

  issues: readonly ImportIssue[];

  /** Si se guardará al confirmar. Duplicados exactos empiezan deseleccionados. */
  selected: boolean;
};

export type ColumnRole =
  | 'date'
  | 'description'
  | 'amount'
  | 'debit'
  | 'credit'
  /** Columna de texto tipo "Cargo"/"Abono" que acompaña a una única columna `amount` (Bible §17). */
  | 'transactionType'
  | 'currency'
  | 'balance'
  | 'ignore';

/** Índice de columna (0-based) -> rol asignado. */
export type ColumnMapping = ReadonlyMap<number, ColumnRole>;

export type ParsedSheet = {
  headers: readonly string[];
  rows: readonly (readonly unknown[])[];
};

export type ImportSummaryCounts = {
  detected: number;
  ready: number;
  needsReview: number;
  duplicates: number;
};

/** Regla personal local: un comercio normalizado conserva su última categoría elegida. */
export type ImportMerchantRule = {
  id: string;
  spaceId: string;
  normalizedMerchant: string;
  categoryId: string;
  confirmations: number;
  source: 'manual' | 'import_correction' | 'system';
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportMerchantRuleSyncRecord = {
  id: string;
  spaceLocalId: string;
  categoryLocalId: string;
  normalizedMerchant: string;
  confirmations: number;
  source: ImportMerchantRule['source'];
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportMerchantRuleSyncPayload = {
  installationId: string;
  userId: string;
  rules: readonly ImportMerchantRuleSyncRecord[];
};

export interface ImportMerchantRuleSyncGateway {
  syncMerchantRules(payload: ImportMerchantRuleSyncPayload): Promise<number>;
}

export type ImportBatchSyncRecord = {
  id: string;
  spaceLocalId: string;
  sourceType: ImportSourceExtension;
  status: LocalImportBatchStatus;
  totalItems: number;
  reviewItems: number;
  duplicateItems: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Hash del archivo original, para detectar reimportaciones (Bible §49, §67). Nunca es el archivo en sí. */
  fileHash?: string;
};

export type ImportItemSyncRecord = {
  id: string;
  batchId: string;
  categoryLocalId?: string;
  duplicateTransactionLocalId?: string;
  sourceRow: number;
  rawDescription: string;
  normalizedMerchant: string;
  occurredOn?: string;
  amountMinor?: number;
  currency?: CurrencyCode;
  movementType: ImportedTransactionCandidate['type'];
  duplicateStatus: ImportDuplicateStatus;
  itemStatus: LocalImportItemStatus;
  selected: boolean;
  issues: readonly ImportIssue[];
  createdAt: string;
  updatedAt: string;
};

export type ImportBatchSyncPayload = {
  installationId: string;
  userId: string;
  batches: readonly ImportBatchSyncRecord[];
  items: readonly ImportItemSyncRecord[];
};

export interface ImportBatchSyncGateway {
  syncImportBatches(payload: ImportBatchSyncPayload): Promise<{
    batchCount: number;
    itemCount: number;
  }>;
}

export type LocalImportBatchStatus =
  | 'parsing'
  | 'mapping_required'
  | 'needs_review'
  | 'ready'
  | 'imported'
  | 'failed'
  | 'cancelled';

export type LocalImportItemStatus =
  'pending' | 'ready' | 'ignored' | 'duplicate' | 'imported' | 'error';

export type LocalImportBatch = {
  id: string;
  spaceId: string;
  sourceType: ImportSourceExtension;
  status: LocalImportBatchStatus;
  totalItems: number;
  reviewItems: number;
  duplicateItems: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  fileHash?: string;
};

/** Comercio confirmado con categoría canónica (`templateKey`), listo para alimentar el consenso comunitario (Bible §50-§54). */
export type MerchantFeedbackQueueEntry = {
  id: string;
  importItemId: string;
  canonicalCategoryKey: string;
  createdAt: string;
  updatedAt: string;
};

export interface MerchantFeedbackSyncGateway {
  /** Envía un voto. Lanza si Supabase lo rechaza (ítem no elegible, sesión inválida, etc.). */
  recordMerchantFeedback(entry: {
    importItemId: string;
    canonicalCategoryKey: string;
  }): Promise<void>;
}
