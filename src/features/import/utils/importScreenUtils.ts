import type {
  ColumnMapping,
  ImportSummaryCounts,
  ImportedTransactionCandidate,
} from '@/features/import/types';

export function formatSavedBatchDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function mappingHasCurrencyColumn(mapping: ColumnMapping): boolean {
  for (const role of mapping.values()) {
    if (role === 'currency') return true;
  }
  return false;
}

export function isCandidateReady(
  candidate: ImportedTransactionCandidate,
): boolean {
  return (
    candidate.occurredOn !== null &&
    candidate.amountMinor !== null &&
    candidate.type !== 'unknown' &&
    candidate.categoryId !== null
  );
}

export function computeSummaryCounts(
  candidates: readonly ImportedTransactionCandidate[],
): ImportSummaryCounts {
  let duplicates = 0;
  let needsReview = 0;

  for (const candidate of candidates) {
    if (candidate.duplicateStatus === 'exact') {
      duplicates += 1;
    } else if (candidate.issues.length > 0 || !isCandidateReady(candidate)) {
      needsReview += 1;
    }
  }

  return {
    detected: candidates.length,
    duplicates,
    needsReview,
    ready: candidates.length - duplicates - needsReview,
  };
}
