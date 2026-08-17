import { buildImportCandidates } from '@/features/import/buildImportCandidates';
import type { Category } from '@/features/categories/types';
import { detectColumnMapping } from '@/features/import/normalization/detectColumnMapping';
import type { SessionTransaction } from '@/features/transactions/types';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'candidate-id' }));

const categories: Category[] = [
  {
    id: 'supermercado',
    spaceId: 'personal',
    name: 'Supermercado',
    icon: 'shopping-cart',
    colorToken: 'green',
    isDefault: false,
    isArchived: false,
  },
];

const options = {
  spaceId: 'personal',
  categories,
  existingTransactions: [] as SessionTransaction[],
  fallbackCurrency: 'EUR' as const,
  dayMonthPreference: 'DMY' as const,
};

describe('buildImportCandidates', () => {
  it('produce un candidato listo por fila válida e ignora filas sin importe', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const candidates = buildImportCandidates(
      [
        ['01/08/2026', 'Supermercado', -32.44],
        ['', 'Página 1 de 3', null],
        ['02/08/2026', 'Nómina', 2000],
      ],
      mapping,
      options,
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ type: 'expense', amountMinor: 3244 });
    expect(candidates[1]).toMatchObject({
      type: 'income',
      amountMinor: 200000,
    });
  });

  it('ignora columnas irrelevantes (banco, titular, sucursal, referencia) y solo usa fecha/concepto/importe', () => {
    const mapping = detectColumnMapping([
      'Banco',
      'Titular',
      'Sucursal',
      'Fecha',
      'Concepto',
      'Importe',
      'Referencia',
    ]);
    const [candidate] = buildImportCandidates(
      [
        [
          'Ficticio',
          'Juan Pérez',
          '0134',
          '01/08/2026',
          'Supermercado',
          -32.44,
          'REF001',
        ],
      ],
      mapping,
      options,
    );

    expect(candidate).toMatchObject({
      occurredOn: '2026-08-01',
      rawDescription: 'Supermercado',
      type: 'expense',
      amountMinor: 3244,
    });
  });

  it('marca como duplicado exacto una fila ya existente en el espacio', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const existingTransactions: SessionTransaction[] = [
      {
        id: 'existing-1',
        createdBy: 'install-test',
        spaceId: 'personal',
        categoryId: 'supermercado',
        type: 'expense',
        amountMinor: 3244,
        currency: 'EUR',
        title: 'Supermercado',
        occurredOn: '2026-08-01',
        recurrence: 'once',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ];

    const [candidate] = buildImportCandidates(
      [['01/08/2026', 'Supermercado', -32.44]],
      mapping,
      { ...options, existingTransactions },
    );

    expect(candidate!.duplicateStatus).toBe('exact');
    expect(candidate!.selected).toBe(false);
  });

  it('ignora movimientos existentes de otro espacio al buscar duplicados', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const existingTransactions: SessionTransaction[] = [
      {
        id: 'existing-1',
        createdBy: 'install-test',
        spaceId: 'couple',
        categoryId: 'supermercado',
        type: 'expense',
        amountMinor: 3244,
        currency: 'EUR',
        title: 'Supermercado',
        occurredOn: '2026-08-01',
        recurrence: 'once',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ];

    const [candidate] = buildImportCandidates(
      [['01/08/2026', 'Supermercado', -32.44]],
      mapping,
      { ...options, existingTransactions },
    );

    expect(candidate!.duplicateStatus).toBe('none');
  });
});
