import { buildPersonalCatalog } from '@/features/demo/scenario/demoCatalogs';
import {
  demoHistoryMonths,
  forEachHistoryMonth,
  pickOne,
  randomInt,
  type DemoAmounts,
  type DemoCalendar,
  type DemoRandom,
  type DemoSpacePlan,
  type DemoTransactionPlan,
} from '@/features/demo/scenario/demoScenarioTools';

type PersonalScenarioInput = {
  amounts: DemoAmounts;
  calendar: DemoCalendar;
  random: DemoRandom;
  coupleSpaceName: string;
};

/**
 * Finanzas propias de quien usa el demo: una nómina, su parte de los gastos
 * de casa transferida al espacio juntos y el día a día de una persona de
 * clase media (cafés, comidas fuera, gimnasio, alguna compra).
 */
export function buildPersonalScenario({
  amounts,
  calendar,
  random,
  coupleSpaceName,
}: PersonalScenarioInput): DemoSpacePlan {
  const { monthDate, isDue } = calendar;
  const transactions: DemoTransactionPlan[] = [];
  const add = (plan: Omit<DemoTransactionPlan, 'author'>) =>
    transactions.push({ author: 'self', ...plan });
  /** Gasto puntual: solo se registra si su fecha ya llegó. */
  const addIfDue = (
    plan: Omit<DemoTransactionPlan, 'author' | 'recurrence'>,
  ) => {
    if (isDue(plan.occurredOn)) add({ ...plan, recurrence: 'once' });
  };
  const start = -demoHistoryMonths;

  // Fijos y recurrentes.
  add({
    type: 'income',
    amountMinor: amounts.income(1400),
    title: 'Nómina',
    categoryKey: 'salary',
    accountKey: 'payroll',
    occurredOn: monthDate(start, 28),
    recurrence: 'monthly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.income(850),
    title: `Aporte a ${coupleSpaceName}`,
    categoryKey: 'household',
    accountKey: 'payroll',
    occurredOn: monthDate(start, 1),
    recurrence: 'monthly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.charm(40),
    title: 'Cuota del gimnasio',
    categoryKey: 'gym',
    accountKey: 'card',
    occurredOn: monthDate(start, 5),
    recurrence: 'monthly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.charm(11),
    title: 'Spotify',
    categoryKey: 'subscriptions',
    accountKey: 'card',
    occurredOn: monthDate(start, 12),
    recurrence: 'monthly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.charm(15),
    title: 'Línea móvil',
    categoryKey: 'utilities',
    accountKey: 'payroll',
    occurredOn: monthDate(start, 20),
    recurrence: 'monthly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(12),
    title: 'Recarga de transporte',
    categoryKey: 'transport',
    accountKey: 'card',
    occurredOn: calendar.nextWeekday(monthDate(start, 1), 1),
    recurrence: 'weekly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(22),
    title: 'Clase de pilates',
    categoryKey: 'gym',
    accountKey: 'card',
    occurredOn: calendar.nextWeekday(monthDate(start, 3), 3),
    recurrence: 'biweekly',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(95),
    title: 'Seguro médico',
    categoryKey: 'health',
    accountKey: 'payroll',
    occurredOn: monthDate(start, 10),
    recurrence: 'custom',
    customOccurrenceDates: [
      monthDate(start, 10),
      monthDate(start + 3, 10),
      monthDate(start + 6, 10),
    ],
    note: 'Pago trimestral',
  });

  // Día a día de cada mes.
  forEachHistoryMonth((month) => {
    const coffees = randomInt(random, 6, 10);
    for (let index = 0; index < coffees; index += 1) {
      const withPastry = random() < 0.25;
      addIfDue({
        type: 'expense',
        amountMinor: withPastry
          ? amounts.price(3.4, 4.8)
          : amounts.price(1.6, 3.2),
        title: withPastry
          ? 'Café y croissant'
          : pickOne(random, ['Café', 'Café con leche', 'Capuchino']),
        categoryKey: 'coffee',
        paidInLocalCurrency: true,
        accountKey: random() < 0.6 ? 'cash' : 'card',
        occurredOn: monthDate(month, randomInt(random, 1, 28)),
      });
    }

    for (let index = randomInt(random, 2, 4); index > 0; index -= 1) {
      addIfDue({
        type: 'expense',
        amountMinor: amounts.price(11, 26),
        title: pickOne(random, [
          'Menú del día',
          'Comida con compañeros',
          'Sushi para llevar',
          'Brunch con amigos',
        ]),
        categoryKey: 'restaurants',
        accountKey: 'card',
        occurredOn: monthDate(month, randomInt(random, 1, 28)),
      });
    }

    for (let index = randomInt(random, 1, 2); index > 0; index -= 1) {
      addIfDue({
        type: 'expense',
        amountMinor: amounts.price(18, 75),
        title: pickOne(random, [
          'Ropa',
          'Zapatillas',
          'Libro',
          'Pedido online',
          'Funda del móvil',
        ]),
        categoryKey: 'shopping',
        accountKey: 'card',
        occurredOn: monthDate(month, randomInt(random, 1, 28)),
      });
    }

    addIfDue({
      type: 'expense',
      amountMinor: amounts.price(8, 35),
      title: pickOne(random, [
        'Cine',
        'Entradas al museo',
        'Videojuego',
        'Bolera',
      ]),
      categoryKey: 'leisure',
      accountKey: 'card',
      occurredOn: monthDate(month, randomInt(random, 8, 27)),
    });

    if (random() < 0.6) {
      addIfDue({
        type: 'expense',
        amountMinor: amounts.price(6, 24),
        title: 'Farmacia',
        paidInLocalCurrency: true,
        categoryKey: 'health',
        accountKey: 'cash',
        occurredOn: monthDate(month, randomInt(random, 1, 28)),
      });
    }

    if (month % 2 === 0) {
      addIfDue({
        type: 'expense',
        amountMinor: amounts.price(18, 35),
        title: 'Peluquería',
        paidInLocalCurrency: true,
        categoryKey: 'personal-care',
        accountKey: 'card',
        occurredOn: monthDate(month, randomInt(random, 4, 24)),
      });
    }
  });

  // Ingresos extra y momentos puntuales.
  for (const month of [-4, -1]) {
    addIfDue({
      type: 'income',
      amountMinor: amounts.income(150 + random() * 150),
      title: 'Proyecto freelance',
      categoryKey: 'freelance',
      accountKey: 'payroll',
      occurredOn: monthDate(month, randomInt(random, 10, 20)),
    });
  }
  addIfDue({
    type: 'expense',
    amountMinor: amounts.price(40, 55),
    title: 'Regalo de cumpleaños',
    categoryKey: 'gifts',
    accountKey: 'card',
    occurredOn: monthDate(-2, 14),
    note: 'Cumpleaños de mamá',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(60),
    title: 'Revisión dental',
    categoryKey: 'health',
    accountKey: 'payroll',
    occurredOn: monthDate(1, 8),
    recurrence: 'once',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(65),
    title: 'Entradas del concierto',
    categoryKey: 'leisure',
    accountKey: 'card',
    occurredOn: monthDate(1, 22),
    recurrence: 'once',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(120),
    title: 'Regalos para la familia',
    categoryKey: 'gifts',
    accountKey: 'card',
    occurredOn: monthDate(2, 15),
    recurrence: 'once',
  });

  return { ...buildPersonalCatalog(amounts), transactions };
}
