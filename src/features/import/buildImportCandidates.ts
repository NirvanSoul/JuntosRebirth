import type { Category } from '@/features/categories/types';
import {
  createDuplicateLookup,
  markDuplicateCandidates,
  registerKnownTransaction,
} from '@/features/import/deduplication/findDuplicateCandidates';
import type { DayMonthPreference } from '@/features/import/normalization/normalizeDate';
import { normalizeDescription } from '@/features/import/normalization/normalizeDescription';
import { normalizeTransactionRow } from '@/features/import/normalization/normalizeTransactionRow';
import type {
  ColumnMapping,
  ImportMerchantRule,
  ImportedTransactionCandidate,
} from '@/features/import/types';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type BuildImportCandidatesOptions = {
  spaceId: string;
  categories: readonly Category[];
  existingTransactions: readonly SessionTransaction[];
  fallbackCurrency: CurrencyCode;
  merchantRules?: readonly ImportMerchantRule[];
  dayMonthPreference: DayMonthPreference;
};

/**
 * Convierte las filas crudas de la hoja ya mapeada en candidatos listos para
 * revisión: normaliza cada fila y después marca duplicados comparando contra
 * los movimientos ya existentes del espacio y entre sí (Bible §7: pipeline
 * completo hasta REVIEW, nunca autocommit).
 */
export function buildImportCandidates(
  rows: readonly (readonly unknown[])[],
  mapping: ColumnMapping,
  options: BuildImportCandidatesOptions,
): ImportedTransactionCandidate[] {
  const candidates: ImportedTransactionCandidate[] = [];

  rows.forEach((row, index) => {
    const candidate = normalizeTransactionRow(row, index + 1, mapping, {
      spaceId: options.spaceId,
      categories: options.categories,
      merchantRules: options.merchantRules,
      fallbackCurrency: options.fallbackCurrency,
      dayMonthPreference: options.dayMonthPreference,
    });
    if (candidate) candidates.push(candidate);
  });

  const lookup = createDuplicateLookup();
  for (const transaction of options.existingTransactions) {
    if (transaction.spaceId !== options.spaceId) continue;

    registerKnownTransaction(lookup, {
      spaceId: transaction.spaceId,
      occurredOn: transaction.occurredOn,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      normalizedMerchant: normalizeDescription(transaction.title)
        .normalizedMerchant,
    });
  }

  return markDuplicateCandidates(candidates, options.spaceId, lookup);
}
