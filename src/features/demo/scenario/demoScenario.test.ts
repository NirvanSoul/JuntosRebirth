import { buildDemoScenario } from '@/features/demo/scenario/demoScenario';
import type { DemoSpacePlan } from '@/features/demo/scenario/demoScenarioTools';
import { demoCurrencies } from '@/features/demo/constants/demoCurrencyProfiles';

const today = '2026-10-17';

function expectConsistentPlan(plan: DemoSpacePlan) {
  const categoryKeys = new Set(plan.categories.map((c) => c.key));
  const accountKeys = new Set(plan.accounts.map((a) => a.key));
  for (const transaction of plan.transactions) {
    expect(categoryKeys.has(transaction.categoryKey)).toBe(true);
    if (transaction.accountKey) {
      expect(accountKeys.has(transaction.accountKey)).toBe(true);
    }
    expect(Number.isSafeInteger(transaction.amountMinor)).toBe(true);
    expect(transaction.amountMinor).toBeGreaterThan(0);
    expect(transaction.occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
}

describe('buildDemoScenario', () => {
  it('es reproducible con la misma semilla', () => {
    const input = { currency: 'EUR' as const, today, seed: 42 };
    expect(buildDemoScenario(input)).toEqual(buildDemoScenario(input));
  });

  it.each(demoCurrencies)('genera un guion coherente en %s', (currency) => {
    const scenario = buildDemoScenario({ currency, today, seed: 7 });

    expectConsistentPlan(scenario.personal);
    expectConsistentPlan(scenario.couple);
    expect(scenario.isVenezuela).toBe(scenario.countryCode === 'VE');
  });

  it('cubre todas las recurrencias, el pasado y el futuro', () => {
    const { personal, couple } = buildDemoScenario({
      currency: 'EUR',
      today,
      seed: 3,
    });
    const all = [...personal.transactions, ...couple.transactions];
    const recurrences = new Set(all.map((t) => t.recurrence));

    expect([...recurrences].sort()).toEqual(
      ['biweekly', 'custom', 'monthly', 'once', 'weekly'].sort(),
    );
    expect(all.some((t) => t.occurredOn < '2026-06-01')).toBe(true);
    expect(
      all.some((t) => t.recurrence === 'once' && t.occurredOn > today),
    ).toBe(true);
    expect(all.some((t) => t.type === 'income')).toBe(true);
    expect(all.some((t) => t.note)).toBe(true);
  });

  it('solo registra gastos variables que ya ocurrieron', () => {
    const { couple } = buildDemoScenario({ currency: 'EUR', today, seed: 9 });
    const futureOnce = couple.transactions.filter(
      (t) => t.recurrence === 'once' && t.occurredOn > today,
    );

    // Lo único futuro y puntual son planes concretos, no la compra semanal.
    expect(futureOnce.map((t) => t.title).sort()).toEqual(
      [
        'Reserva casa rural',
        'Revisión del coche',
        'Vuelos para las fiestas',
      ].sort(),
    );
  });

  it('reparte la autoría del espacio juntos entre las dos personas', () => {
    const scenario = buildDemoScenario({ currency: 'EUR', today, seed: 11 });
    const coupleAuthors = new Set(
      scenario.couple.transactions.map((t) => t.author),
    );

    expect(coupleAuthors).toEqual(new Set(['self', 'partner']));
    expect(
      scenario.personal.transactions.every((t) => t.author === 'self'),
    ).toBe(true);
    expect(scenario.selfName).not.toBe(scenario.partnerName);
    expect(
      scenario.couple.transactions.some(
        (t) => t.title === `Aporte de ${scenario.partnerName}`,
      ),
    ).toBe(true);
  });

  it('incluye categorías predeterminadas y personalizadas', () => {
    const { personal, couple } = buildDemoScenario({
      currency: 'EUR',
      today,
      seed: 5,
    });
    for (const plan of [personal, couple]) {
      expect(plan.categories.some((c) => c.isDefault)).toBe(true);
      expect(plan.categories.some((c) => !c.isDefault)).toBe(true);
      expect(plan.categories.some((c) => c.budgetMinor)).toBe(true);
    }
  });

  it('escala los importes al coste de vida y redondea como en cada país', () => {
    const eur = buildDemoScenario({ currency: 'EUR', today, seed: 1 });
    const cop = buildDemoScenario({ currency: 'COP', today, seed: 1 });
    const rent = (scenario: typeof eur) =>
      scenario.couple.transactions.find((t) => t.title === 'Alquiler')!
        .amountMinor;

    expect(rent(eur)).toBe(80_000);
    expect(rent(cop)).toBe(114_000_000);
    // Un peso colombiano se apunta en centenas, nunca con céntimos.
    expect(
      cop.couple.transactions.every((t) => t.amountMinor % 10_000 === 0),
    ).toBe(true);
    // El precio comercial termina en 9: 13,99 € o 19.900 COP.
    const netflix = (scenario: typeof eur) =>
      scenario.couple.transactions.find((t) => t.title === 'Netflix')!
        .amountMinor;
    expect(netflix(eur)).toBe(1_399);
    expect(netflix(cop)).toBe(1_990_000);
  });

  // Nómina neta mínima de cada país en 2026, en unidades mayores.
  it.each([
    ['EUR', 1_330],
    ['MXN', 9_500],
    ['COP', 1_860_000],
    ['ARS', 325_000],
    ['CLP', 440_000],
    ['PEN', 1_070],
    ['GBP', 1_800],
  ] as const)(
    'paga en %s una nómina algo por encima del mínimo',
    (currency, minimum) => {
      const { personal } = buildDemoScenario({ currency, today, seed: 6 });
      const salary = personal.transactions.find((t) => t.title === 'Nómina')!;

      expect(salary.amountMinor).toBeGreaterThanOrEqual(minimum * 100);
      expect(salary.amountMinor).toBeLessThanOrEqual(minimum * 100 * 1.25);
    },
  );

  it('mantiene la casa en números razonables cada mes', () => {
    const { couple } = buildDemoScenario({ currency: 'EUR', today, seed: 2 });
    const september = couple.transactions.filter(
      (t) => t.recurrence === 'once' && t.occurredOn.startsWith('2026-09'),
    );
    const variableSpend = september
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amountMinor, 0);

    // Compra, facturas, cenas y demás: entre 500 € y 1.000 € al mes.
    expect(variableSpend).toBeGreaterThan(50_000);
    expect(variableSpend).toBeLessThan(100_000);
  });

  it('crea un usuario venezolano con contabilidad en USD y compras en bolívares', () => {
    const scenario = buildDemoScenario({ currency: 'VES', today, seed: 4 });
    const all = [
      ...scenario.personal.transactions,
      ...scenario.couple.transactions,
    ];
    const inBolivars = all.filter((t) => t.currency === 'VES');

    expect(scenario).toMatchObject({
      countryCode: 'VE',
      currency: 'USD',
      activeCurrencies: ['USD', 'VES'],
      isVenezuela: true,
    });
    expect(inBolivars.length).toBeGreaterThan(20);
    // Las cuentas venezolanas solo tienen saldo en USD.
    expect(inBolivars.every((t) => t.accountKey === undefined)).toBe(true);
    // Lo fijo sigue en dólares: nómina de unos 870 $ y alquiler de unos 300 $.
    const byTitle = (title: string) => all.find((t) => t.title === title)!;
    expect(byTitle('Nómina')).toMatchObject({ amountMinor: 87_000 });
    expect(byTitle('Alquiler')).toMatchObject({ amountMinor: 30_000 });
    expect(byTitle('Nómina').currency).toBeUndefined();
    // Un café cuesta cientos de bolívares, no centavos.
    const coffee = all.find(
      (t) => t.categoryKey === 'coffee' && t.currency === 'VES',
    )!;
    expect(coffee.amountMinor).toBeGreaterThanOrEqual(10_000);
  });
});
