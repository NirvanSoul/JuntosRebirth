import type { ImportedTransactionCandidate } from '@/features/import/types';
import { isCandidateReady } from '@/features/import/utils/importScreenUtils';

function candidate(
  overrides: Partial<ImportedTransactionCandidate> = {},
): ImportedTransactionCandidate {
  return {
    id: 'candidate-1',
    sourceRowNumber: 1,
    rawDescription: 'MERCADONA MADRID',
    normalizedMerchant: 'mercadona',
    displayTitle: 'Mercadona',
    occurredOn: '2026-08-01',
    amountMinor: 3244,
    currency: 'VES',
    type: 'expense',
    suggestedCategoryId: 'groceries',
    categoryId: 'groceries',
    duplicateStatus: 'none',
    issues: [],
    selected: true,
    ...overrides,
  };
}

describe('isCandidateReady', () => {
  it('exige una moneda válida como defensa antes de dejar importar', () => {
    expect(isCandidateReady(candidate({ currency: null }))).toBe(false);
    expect(isCandidateReady(candidate({ currency: 'VES' }))).toBe(true);
  });
});
