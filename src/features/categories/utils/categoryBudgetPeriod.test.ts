import type {
  BudgetSchedule,
  Category,
  CategoryBudget,
} from '@/features/categories/types';
import {
  applyCategoryBudgetChange,
  describeBudgetSchedule,
  formatCategoryBudgetPeriod,
  getCategoryBudget,
  getBudgetPeriodRange,
  getCategoryBudgetRange,
  getCategoryBudgetStartKey,
  getProratedBudgetAmount,
  hasBudgetOverride,
  resolveBudgetAmount,
  shiftCategoryBudgetPeriod,
  withCategoryBudget,
} from '@/features/categories/utils/categoryBudgetPeriod';
import { toLocalDateKey } from '@/lib/date/localDate';

const category: CategoryBudget = { budgetMinor: 5000 };

/** Los cambios que no quitan el presupuesto siempre devuelven uno. */
function applyChange(
  ...args: Parameters<typeof applyCategoryBudgetChange>
): CategoryBudget {
  const budget = applyCategoryBudgetChange(...args);
  if (!budget) throw new Error('Se esperaba un presupuesto');
  return budget;
}

const everyTenDays: BudgetSchedule = {
  period: 'custom',
  intervalDays: 10,
  anchorOn: '2026-07-05',
};

const keys = (range: { end: Date; start: Date }) => [
  toLocalDateKey(range.start),
  toLocalDateKey(range.end),
];

describe('getBudgetPeriodRange', () => {
  it('reutiliza los periodos de Actividad para mes, semana y quincena', () => {
    const date = new Date(2026, 6, 15, 12);

    expect(keys(getBudgetPeriodRange({ period: 'month' }, date))).toEqual([
      '2026-07-01',
      '2026-07-31',
    ]);
    expect(keys(getBudgetPeriodRange({ period: 'week' }, date))).toEqual([
      '2026-07-13',
      '2026-07-19',
    ]);
    expect(keys(getBudgetPeriodRange({ period: 'fortnight' }, date))).toEqual([
      '2026-07-01',
      '2026-07-15',
    ]);
  });

  it('cuenta bloques de N días desde la fecha de inicio, también hacia atrás', () => {
    expect(
      keys(getBudgetPeriodRange(everyTenDays, new Date(2026, 6, 15, 12))),
    ).toEqual(['2026-07-15', '2026-07-24']);
    expect(
      keys(getBudgetPeriodRange(everyTenDays, new Date(2026, 6, 14, 12))),
    ).toEqual(['2026-07-05', '2026-07-14']);
    expect(
      keys(getBudgetPeriodRange(everyTenDays, new Date(2026, 6, 1, 12))),
    ).toEqual(['2026-06-25', '2026-07-04']);
  });
});

describe('shiftCategoryBudgetPeriod', () => {
  const custom: CategoryBudget = { ...category, budgetSchedule: everyTenDays };

  it('avanza y retrocede un bloque personalizado completo', () => {
    const date = new Date(2026, 6, 20, 12);

    expect(toLocalDateKey(shiftCategoryBudgetPeriod(custom, date, 1))).toBe(
      '2026-07-25',
    );
    expect(
      getCategoryBudgetStartKey(
        custom,
        shiftCategoryBudgetPeriod(custom, date, -1),
      ),
    ).toBe('2026-07-05');
  });

  it('cruza el cambio de año en semanas', () => {
    const weekly: CategoryBudget = {
      ...category,
      budgetSchedule: { period: 'week' },
    };
    const next = shiftCategoryBudgetPeriod(
      weekly,
      new Date(2026, 11, 30, 12),
      1,
    );

    expect(getCategoryBudgetStartKey(weekly, next)).toBe('2027-01-04');
  });
});

describe('formatCategoryBudgetPeriod', () => {
  it('describe la periodicidad y el rango personalizado', () => {
    expect(describeBudgetSchedule({ period: 'fortnight' })).toBe('Quincenal');
    expect(describeBudgetSchedule(everyTenDays)).toBe('Cada 10 días');
    expect(
      formatCategoryBudgetPeriod(
        { ...category, budgetSchedule: everyTenDays },
        new Date(2026, 6, 15, 12),
      ),
    ).toBe('15 jul – 24 jul 2026');
  });
});

describe('cambio de periodicidad desde un periodo', () => {
  // Mensual hasta septiembre; semanal (60 €) desde el 1 de octubre.
  const changed = applyChange(
    {
      ...category,
      budgetOverrides: [
        { periodStartOn: '2026-08-01', amountMinor: 9000 },
        { periodStartOn: '2026-11-01', amountMinor: 7000 },
      ],
    },
    {
      kind: 'from',
      startsOn: '2026-10-01',
      amountMinor: 6000,
      schedule: { period: 'week' },
    },
  );

  it('conserva lo anterior como tramo y descarta excepciones posteriores', () => {
    expect(changed.budgetHistory).toEqual([
      {
        endsOn: '2026-09-30',
        amountMinor: 5000,
        schedule: { period: 'month' },
      },
    ]);
    expect(changed.budgetSchedule).toEqual({ period: 'week' });
    expect(changed.budgetOverrides).toEqual([
      { periodStartOn: '2026-08-01', amountMinor: 9000 },
    ]);
  });

  it('resuelve cada fecha con su tramo y recorta el periodo frontera', () => {
    expect(resolveBudgetAmount(changed, new Date(2026, 8, 10, 12))).toBe(5000);
    expect(resolveBudgetAmount(changed, new Date(2026, 7, 10, 12))).toBe(9000);
    expect(resolveBudgetAmount(changed, new Date(2026, 9, 14, 12))).toBe(6000);
    // La semana del 28 sep al 4 oct empieza en el nuevo tramo el 1 de octubre.
    expect(
      keys(getCategoryBudgetRange(changed, new Date(2026, 9, 2, 12))),
    ).toEqual(['2026-10-01', '2026-10-04']);
    expect(
      keys(getCategoryBudgetRange(changed, new Date(2026, 8, 29, 12))),
    ).toEqual(['2026-09-01', '2026-09-30']);
    expect(
      getCategoryBudgetStartKey(
        changed,
        shiftCategoryBudgetPeriod(changed, new Date(2026, 9, 2, 12), -1),
      ),
    ).toBe('2026-09-01');
  });
});

describe('getProratedBudgetAmount', () => {
  it('reparte el importe del periodo por los días del rango', () => {
    // Una semana de un presupuesto de 31 € en julio (31 días): 7 €.
    expect(
      getProratedBudgetAmount(
        { ...category, budgetMinor: 3100 },
        '2026-07-13',
        '2026-07-19',
      ),
    ).toBe(700);
  });
});

describe('resolveBudgetAmount', () => {
  const edited: CategoryBudget = {
    ...category,
    budgetOverrides: [{ periodStartOn: '2026-06-01', amountMinor: 9000 }],
  };

  it('usa la excepción del periodo y el importe base en el resto', () => {
    expect(resolveBudgetAmount(edited, new Date(2026, 5, 20, 12))).toBe(9000);
    expect(hasBudgetOverride(edited, new Date(2026, 5, 20, 12))).toBe(true);
    expect(resolveBudgetAmount(edited, new Date(2026, 6, 20, 12))).toBe(5000);
    expect(hasBudgetOverride(edited, new Date(2026, 6, 20, 12))).toBe(false);
  });

  it('no devuelve importe si la categoría no tiene presupuesto', () => {
    expect(
      resolveBudgetAmount(
        { ...edited, budgetMinor: 0 },
        new Date(2026, 5, 20, 12),
      ),
    ).toBeUndefined();
  });
});

describe('applyCategoryBudgetChange', () => {
  const edited: CategoryBudget = {
    ...category,
    budgetOverrides: [{ periodStartOn: '2026-06-01', amountMinor: 9000 }],
  };

  it('conserva las excepciones si la periodicidad no cambia', () => {
    const updated = applyChange(edited, {
      kind: 'base',
      amountMinor: 6000,
      schedule: { period: 'month' },
    });

    expect(updated.budgetMinor).toBe(6000);
    expect(updated.budgetSchedule).toBeUndefined();
    expect(updated.budgetOverrides).toEqual(edited.budgetOverrides);
  });

  it('descarta las excepciones al cambiar la periodicidad', () => {
    const updated = applyChange(edited, {
      kind: 'base',
      amountMinor: 1500,
      schedule: { period: 'week' },
    });

    expect(updated.budgetSchedule).toEqual({ period: 'week' });
    expect(updated.budgetOverrides).toBeUndefined();
  });

  it('añade, sustituye y quita el importe de un periodo', () => {
    const added = applyChange(edited, {
      kind: 'period',
      periodStartOn: '2026-08-01',
      amountMinor: 7000,
    });
    expect(added.budgetOverrides).toEqual([
      { periodStartOn: '2026-06-01', amountMinor: 9000 },
      { periodStartOn: '2026-08-01', amountMinor: 7000 },
    ]);

    const reverted = applyChange(added, {
      kind: 'period',
      periodStartOn: '2026-06-01',
    });
    expect(reverted.budgetOverrides).toEqual([
      { periodStartOn: '2026-08-01', amountMinor: 7000 },
    ]);

    // Igual al importe base no es una excepción.
    const same = applyChange(reverted, {
      kind: 'period',
      periodStartOn: '2026-08-01',
      amountMinor: 5000,
    });
    expect(same.budgetOverrides).toBeUndefined();
  });

  it('quitar el presupuesto limpia periodicidad y excepciones', () => {
    const removed = applyCategoryBudgetChange(
      { ...edited, budgetSchedule: { period: 'week' } },
      { kind: 'remove' },
    );

    expect(removed).toBeUndefined();
  });
});

describe('withCategoryBudget', () => {
  const food: Category = {
    id: 'food',
    spaceId: 'personal',
    name: 'Comida',
    icon: 'fork-knife',
    colorToken: 'orange',
    budgets: { EUR: { budgetMinor: 5000 } },
    isDefault: false,
    isArchived: false,
  };

  it('añade o quita el presupuesto de una moneda sin tocar las demás', () => {
    const withUsd = withCategoryBudget(food, 'USD', { budgetMinor: 3000 });
    expect(withUsd.budgets).toEqual({
      EUR: { budgetMinor: 5000 },
      USD: { budgetMinor: 3000 },
    });
    expect(getCategoryBudget(withUsd, 'USD')).toEqual({ budgetMinor: 3000 });
    expect(getCategoryBudget(food, 'USD')).toBeUndefined();

    const withoutEur = withCategoryBudget(withUsd, 'EUR', undefined);
    expect(withoutEur.budgets).toEqual({ USD: { budgetMinor: 3000 } });
    expect(
      withCategoryBudget(withoutEur, 'USD', undefined).budgets,
    ).toBeUndefined();
  });

  it('crea un presupuesto nuevo en una moneda que no lo tenía', () => {
    expect(
      applyCategoryBudgetChange(undefined, {
        kind: 'base',
        amountMinor: 3000,
        schedule: { period: 'week' },
      }),
    ).toEqual({ budgetMinor: 3000, budgetSchedule: { period: 'week' } });
  });
});

describe('cambio de importe desde un mes', () => {
  const month = { period: 'month' } as const;
  const from = (
    budget: CategoryBudget,
    startsOn: string,
    amountMinor: number,
  ) =>
    applyChange(budget, {
      kind: 'from',
      startsOn,
      amountMinor,
      schedule: month,
    });
  const at = (budget: CategoryBudget, monthIndex: number) =>
    resolveBudgetAmount(budget, new Date(2026, monthIndex, 15, 12));

  it('cambia ese mes y los siguientes, nunca los anteriores', () => {
    // 300 € en octubre, 100 € desde noviembre y 175 € desde diciembre.
    const october = { budgetMinor: 30_000 };
    const november = from(october, '2026-11-01', 10_000);
    const december = from(november, '2026-12-01', 17_500);
    expect([at(december, 9), at(december, 10), at(december, 11)]).toEqual([
      30_000, 10_000, 17_500,
    ]);
    // Volver a cambiar noviembre no toca octubre ni diciembre en adelante.
    const edited = from(november, '2026-11-01', 12_000);
    expect([at(edited, 9), at(edited, 10), at(edited, 11)]).toEqual([
      30_000, 12_000, 12_000,
    ]);
  });

  it('une el tramo con el anterior si recupera su importe', () => {
    const november = from({ budgetMinor: 30_000 }, '2026-11-01', 10_000);
    const reverted = from(november, '2026-11-01', 30_000);
    expect(reverted).toEqual({ budgetMinor: 30_000 });
  });
});
