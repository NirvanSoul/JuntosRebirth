import { groupImportCandidates } from '@/features/import/utils/groupImportCandidates';
import type { ImportedTransactionCandidate } from '@/features/import/types';

function candidate(
  id: string,
  normalizedMerchant: string,
  type: 'expense' | 'income' = 'expense',
): ImportedTransactionCandidate {
  return {
    id,
    sourceRowNumber: 1,
    rawDescription: normalizedMerchant,
    normalizedMerchant,
    displayTitle: normalizedMerchant.toUpperCase(),
    occurredOn: '2026-08-07',
    amountMinor: 1000,
    currency: 'EUR',
    type,
    suggestedCategoryId: null,
    categoryId: null,
    duplicateStatus: 'none',
    issues: [],
    selected: false,
  };
}

describe('groupImportCandidates', () => {
  it('agrupa por comercio normalizado y conserva el tipo de cada movimiento', () => {
    const groups = groupImportCandidates([
      candidate('one', 'bizum recibido', 'income'),
      candidate('two', 'bizum recibido', 'expense'),
      candidate('three', 'mercadona'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      normalizedMerchant: 'bizum recibido',
      candidates: [
        { id: 'one', type: 'income' },
        { id: 'two', type: 'expense' },
      ],
    });
  });

  it('no agrupa descripciones vacías entre sí', () => {
    expect(
      groupImportCandidates([candidate('one', ''), candidate('two', '')]),
    ).toHaveLength(2);
  });

  it('conserva el orden de los comercios nuevos y deja los duplicados exactos al final', () => {
    const uncategorized = candidate('uncategorized', 'bizum');
    const ready = { ...candidate('ready', 'mercadona'), categoryId: 'food' };
    const duplicate = {
      ...candidate('duplicate', 'antiguo'),
      duplicateStatus: 'exact' as const,
    };
    const mixedDuplicate = {
      ...candidate('mixed-duplicate', 'mercadona'),
      duplicateStatus: 'exact' as const,
    };

    const groups = groupImportCandidates([
      duplicate,
      ready,
      mixedDuplicate,
      uncategorized,
    ]);

    expect(groups.map((group) => group.normalizedMerchant)).toEqual([
      'mercadona',
      'bizum',
      'antiguo',
    ]);
    expect(groups[0]?.candidates.map((item) => item.id)).toEqual([
      'ready',
      'mixed-duplicate',
    ]);
  });
});
