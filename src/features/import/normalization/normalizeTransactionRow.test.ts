import type { Category } from '@/features/categories/types';
import { detectColumnMapping } from '@/features/import/normalization/detectColumnMapping';
import { normalizeTransactionRow } from '@/features/import/normalization/normalizeTransactionRow';
import { isCandidateReady } from '@/features/import/utils/importScreenUtils';

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

  describe('validación de fracciones para monedas sin decimales', () => {
    const fallbackJPYOptions = {
      ...options,
      fallbackCurrency: 'JPY' as const,
    };

    it('acepta un importe sin fracción para moneda JPY', () => {
      const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', 1000],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBe(1000);
      expect(candidate?.currency).toBe('JPY');
      expect(
        candidate?.issues.some(
          (issue) => issue.code === 'invalid_fraction_for_currency',
        ),
      ).toBe(false);
    });

    it('emite invalid_fraction_for_currency y anula el importe cuando tiene fracción en moneda JPY', () => {
      const mapping = detectColumnMapping(['Fecha', 'Concepto', 'Importe']);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', 1000.5],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      expect(
        candidate?.issues.some(
          (issue) => issue.code === 'invalid_fraction_for_currency',
        ),
      ).toBe(true);
      // No debe emitir unparseable_amount para evitar duplicados
      expect(
        candidate?.issues.some((issue) => issue.code === 'unparseable_amount'),
      ).toBe(false);
    });

    it('maneja fracción inválida en las columnas de débito/crédito', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidateDebit = normalizeTransactionRow(
        ['01/08/2026', 'Compra', '50,50', null],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidateDebit?.amountMinor).toBeNull();
      expect(
        candidateDebit?.issues.some(
          (issue) =>
            issue.code === 'invalid_fraction_for_currency' &&
            issue.message.includes('El gasto'),
        ),
      ).toBe(true);

      const candidateCredit = normalizeTransactionRow(
        ['02/08/2026', 'Ingreso', null, '50,50'],
        2,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidateCredit?.amountMinor).toBeNull();
      expect(
        candidateCredit?.issues.some(
          (issue) =>
            issue.code === 'invalid_fraction_for_currency' &&
            issue.message.includes('El ingreso'),
        ),
      ).toBe(true);
    });

    it('combina fracción inválida en débito y crédito en un solo aviso', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', '50,50', '60.50'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      const invalidIssues = candidate?.issues.filter(
        (i) => i.code === 'invalid_fraction_for_currency',
      );
      expect(invalidIssues).toHaveLength(1);
      expect(invalidIssues![0]!.message).toContain('El importe');
    });

    it('bloquea la fila si el débito tiene fracción inválida aunque el crédito sea válido', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', '50,50', '6000'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      expect(candidate?.type).toBe('unknown');
      expect(isCandidateReady(candidate!)).toBe(false);
      expect(
        candidate?.issues.some(
          (issue) =>
            issue.code === 'invalid_fraction_for_currency' &&
            issue.message.includes('El gasto'),
        ),
      ).toBe(true);
    });

    it('bloquea la fila si el crédito tiene fracción inválida aunque el débito sea válido', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', '6000', '50,50'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      expect(candidate?.type).toBe('unknown');
      expect(isCandidateReady(candidate!)).toBe(false);
      expect(
        candidate?.issues.some(
          (issue) =>
            issue.code === 'invalid_fraction_for_currency' &&
            issue.message.includes('El ingreso'),
        ),
      ).toBe(true);
    });

    it('bloquea la fila si el débito es irreconocible (unparseable) aunque el crédito sea válido', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', 'no es numero', '6000'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      expect(candidate?.type).toBe('unknown');
      expect(isCandidateReady(candidate!)).toBe(false);
      expect(
        candidate?.issues.some(
          (issue) =>
            issue.code === 'unparseable_amount' &&
            issue.message.includes('el gasto'),
        ),
      ).toBe(true);
    });

    it('bloquea la fila si el crédito es irreconocible (unparseable) aunque el débito sea válido', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', '6000', 'no es numero'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      expect(candidate?.type).toBe('unknown');
      expect(isCandidateReady(candidate!)).toBe(false);
      expect(
        candidate?.issues.some(
          (issue) =>
            issue.code === 'unparseable_amount' &&
            issue.message.includes('el ingreso'),
        ),
      ).toBe(true);
    });

    it('emite causas distintas sin solaparse (débito inválido, crédito irreconocible)', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Debit',
        'Credit',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', '50.50', 'bad'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.amountMinor).toBeNull();
      expect(candidate?.type).toBe('unknown');
      expect(isCandidateReady(candidate!)).toBe(false);
      expect(
        candidate?.issues.some(
          (issue) =>
            issue.code === 'invalid_fraction_for_currency' &&
            issue.message.includes('El gasto'),
        ),
      ).toBe(true);
      expect(
        candidate?.issues.some(
          (issue) =>
            issue.code === 'unparseable_amount' &&
            issue.message.includes('el ingreso'),
        ),
      ).toBe(true);
    });

    it('moneda inválida + fallback JPY + fracción incompatible produce unknown_currency e invalid_fraction_for_currency', () => {
      const mapping = detectColumnMapping([
        'Fecha',
        'Concepto',
        'Importe',
        'Moneda',
      ]);
      const candidate = normalizeTransactionRow(
        ['01/08/2026', 'Compra', 10.5, 'ZZZ'],
        1,
        mapping,
        fallbackJPYOptions,
      );

      expect(candidate?.currency).toBe('JPY'); // Fallback fue usado
      expect(candidate?.amountMinor).toBeNull(); // Se bloquea por los decimales de JPY
      expect(
        candidate?.issues.some((issue) => issue.code === 'unknown_currency'),
      ).toBe(true);
      expect(
        candidate?.issues.some(
          (issue) => issue.code === 'invalid_fraction_for_currency',
        ),
      ).toBe(true);
      expect(
        candidate?.issues.some((issue) => issue.code === 'unparseable_amount'),
      ).toBe(false);
    });
  });
});
