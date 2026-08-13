import {
  createDuplicateLookup,
  detectDuplicateStatus,
  markDuplicateCandidates,
  registerKnownTransaction,
} from '@/features/import/deduplication/findDuplicateCandidates';
import type { ImportedTransactionCandidate } from '@/features/import/types';

function buildCandidate(
  overrides: Partial<ImportedTransactionCandidate> = {},
): ImportedTransactionCandidate {
  return {
    id: 'candidate-1',
    sourceRowNumber: 1,
    rawDescription: 'MERCADONA MADRID',
    normalizedMerchant: 'mercadona madrid',
    displayTitle: 'MERCADONA MADRID',
    occurredOn: '2026-08-01',
    amountMinor: 3244,
    currency: 'EUR',
    type: 'expense',
    suggestedCategoryId: null,
    categoryId: null,
    duplicateStatus: 'none',
    issues: [],
    selected: true,
    ...overrides,
  };
}

describe('detectDuplicateStatus', () => {
  it('detecta un duplicado exacto', () => {
    const lookup = createDuplicateLookup();
    registerKnownTransaction(lookup, {
      spaceId: 'personal',
      occurredOn: '2026-08-01',
      amountMinor: 3244,
      currency: 'EUR',
      normalizedMerchant: 'mercadona madrid',
    });

    expect(
      detectDuplicateStatus(
        {
          spaceId: 'personal',
          occurredOn: '2026-08-01',
          amountMinor: 3244,
          currency: 'EUR',
          normalizedMerchant: 'mercadona madrid',
        },
        lookup,
      ),
    ).toBe('exact');
  });

  it('detecta un duplicado probable cuando solo cambia la descripción', () => {
    const lookup = createDuplicateLookup();
    registerKnownTransaction(lookup, {
      spaceId: 'personal',
      occurredOn: '2026-08-01',
      amountMinor: 3244,
      currency: 'EUR',
      normalizedMerchant: 'mercadona madrid',
    });

    expect(
      detectDuplicateStatus(
        {
          spaceId: 'personal',
          occurredOn: '2026-08-01',
          amountMinor: 3244,
          currency: 'EUR',
          normalizedMerchant: 'otro comercio',
        },
        lookup,
      ),
    ).toBe('probable');
  });

  it('no marca dos compras reales distintas como duplicado', () => {
    const lookup = createDuplicateLookup();
    registerKnownTransaction(lookup, {
      spaceId: 'personal',
      occurredOn: '2026-08-01',
      amountMinor: 3244,
      currency: 'EUR',
      normalizedMerchant: 'mercadona madrid',
    });

    expect(
      detectDuplicateStatus(
        {
          spaceId: 'personal',
          occurredOn: '2026-08-02',
          amountMinor: 3244,
          currency: 'EUR',
          normalizedMerchant: 'mercadona madrid',
        },
        lookup,
      ),
    ).toBe('none');
  });
});

describe('markDuplicateCandidates', () => {
  it('deselecciona los duplicados exactos frente a movimientos existentes', () => {
    const lookup = createDuplicateLookup();
    registerKnownTransaction(lookup, {
      spaceId: 'personal',
      occurredOn: '2026-08-01',
      amountMinor: 3244,
      currency: 'EUR',
      normalizedMerchant: 'mercadona madrid',
    });

    const [marked] = markDuplicateCandidates(
      [buildCandidate()],
      'personal',
      lookup,
    );

    expect(marked!.duplicateStatus).toBe('exact');
    expect(marked!.selected).toBe(false);
  });

  it('detecta duplicados dentro del propio archivo importado dos veces', () => {
    const lookup = createDuplicateLookup();
    const candidates = [
      buildCandidate({ id: 'a' }),
      buildCandidate({ id: 'b' }),
    ];

    const marked = markDuplicateCandidates(candidates, 'personal', lookup);

    expect(marked[0]!.duplicateStatus).toBe('none');
    expect(marked[1]!.duplicateStatus).toBe('exact');
    expect(marked[1]!.selected).toBe(false);
  });

  it('mantiene seleccionado un duplicado probable, solo con aviso', () => {
    const lookup = createDuplicateLookup();
    registerKnownTransaction(lookup, {
      spaceId: 'personal',
      occurredOn: '2026-08-01',
      amountMinor: 3244,
      currency: 'EUR',
      normalizedMerchant: 'otro comercio',
    });

    const [marked] = markDuplicateCandidates(
      [buildCandidate()],
      'personal',
      lookup,
    );

    expect(marked!.duplicateStatus).toBe('probable');
    expect(marked!.selected).toBe(true);
    expect(
      marked!.issues.some((issue) => issue.code === 'probable_duplicate'),
    ).toBe(true);
  });

  it('no evalúa un candidato sin fecha o importe resueltos', () => {
    const lookup = createDuplicateLookup();
    const candidate = buildCandidate({ occurredOn: null, amountMinor: null });

    const [marked] = markDuplicateCandidates([candidate], 'personal', lookup);

    expect(marked).toEqual(candidate);
  });
});
