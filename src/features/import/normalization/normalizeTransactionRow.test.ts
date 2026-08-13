import type { Category } from '@/features/categories/types';
import { detectColumnMapping } from '@/features/import/normalization/detectColumnMapping';
import { normalizeTransactionRow } from '@/features/import/normalization/normalizeTransactionRow';

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
  fallbackCurrency: 'EUR' as const,
  dayMonthPreference: 'DMY' as const,
};

describe('normalizeTransactionRow', () => {
  it('normaliza una fila con importe firmado y categoría reconocida', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const candidate = normalizeTransactionRow(
      ['25/03/2026', 'SUPERMERCADO', -32.44],
      1,
      mapping,
      options,
    );

    expect(candidate).toMatchObject({
      occurredOn: '2026-03-25',
      amountMinor: 3244,
      type: 'expense',
      currency: 'EUR',
      categoryId: 'supermercado',
    });
    expect(candidate?.issues).toHaveLength(0);
  });

  it('usa columnas de débito y crédito separadas', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Debit',
      'Credit',
    ]);
    const expense = normalizeTransactionRow(
      ['01/08/2026', 'Compra', '50,00', null],
      1,
      mapping,
      options,
    );
    const income = normalizeTransactionRow(
      ['02/08/2026', 'Nómina', null, '2000,00'],
      2,
      mapping,
      options,
    );

    expect(expense).toMatchObject({ type: 'expense', amountMinor: 5000 });
    expect(income).toMatchObject({ type: 'income', amountMinor: 200000 });
  });

  it('marca unknown_type cuando débito y crédito llegan a la vez, sin duplicar el aviso de importe', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Debit',
      'Credit',
    ]);
    const candidate = normalizeTransactionRow(
      ['25/08/2026', 'Rareza', '10,00', '10,00'],
      1,
      mapping,
      options,
    );

    expect(candidate?.type).toBe('unknown');
    expect(candidate?.issues).toHaveLength(1); // unknown_type
    expect(
      candidate?.issues.some((issue) => issue.code === 'unknown_type'),
    ).toBe(true);
    expect(
      candidate?.issues.some((issue) => issue.code === 'unparseable_amount'),
    ).toBe(false);
  });

  it('prioriza una columna de tipo explícita (Cargo/Abono) sobre el signo del importe', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Importe',
      'Tipo',
    ]);
    // Importe positivo pero la columna de tipo dice "Cargo": debe ganar el
    // indicador explícito y clasificarse como gasto (Bible §17).
    const candidate = normalizeTransactionRow(
      ['01/08/2026', 'Supermercado', 32.44, 'Cargo'],
      1,
      mapping,
      options,
    );

    expect(candidate).toMatchObject({ type: 'expense', amountMinor: 3244 });
  });

  it('reconoce "Abono" como ingreso en una columna de tipo', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Importe',
      'Tipo',
    ]);
    const candidate = normalizeTransactionRow(
      ['01/08/2026', 'Nómina', 2000, 'Abono'],
      1,
      mapping,
      options,
    );

    expect(candidate).toMatchObject({ type: 'income', amountMinor: 200000 });
  });

  it('deja la categoría vacía para revisión sin convertirlo en un error', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const candidate = normalizeTransactionRow(
      ['01/08/2026', 'Comercio desconocido', -10],
      1,
      mapping,
      options,
    );

    expect(candidate?.categoryId).toBeNull();
    expect(
      candidate?.issues.some((issue) => issue.code === 'unknown_category'),
    ).toBe(false);
  });

  it('resuelve la fecha por preferencia sin añadir una advertencia', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const candidate = normalizeTransactionRow(
      ['03/04/2026', 'Supermercado', -10],
      1,
      mapping,
      options,
    );

    expect(candidate?.occurredOn).toBe('2026-04-03');
    expect(
      candidate?.issues.some((issue) => issue.code === 'ambiguous_date'),
    ).toBe(false);
  });

  it('devuelve null para una fila sin ninguna señal de importe', () => {
    const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
    const candidate = normalizeTransactionRow(
      ['', 'Página 1 de 3', null],
      1,
      mapping,
      options,
    );

    expect(candidate).toBeNull();
  });

  it('usa la moneda de la fila cuando está presente', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Importe',
      'Moneda',
    ]);
    const candidate = normalizeTransactionRow(
      ['01/08/2026', 'Compra', -10, 'USD'],
      1,
      mapping,
      options,
    );

    expect(candidate?.currency).toBe('USD');
  });

  it('cae a la moneda por defecto y marca el aviso ante una moneda desconocida', () => {
    const mapping = detectColumnMapping([
      'Fecha',
      'Concepto',
      'Importe',
      'Moneda',
    ]);
    const candidate = normalizeTransactionRow(
      ['01/08/2026', 'Compra', -10, 'ZZZ'],
      1,
      mapping,
      options,
    );

    expect(candidate?.currency).toBe('EUR');
    expect(
      candidate?.issues.some((issue) => issue.code === 'unknown_currency'),
    ).toBe(true);
  });
});
