import { buildCoupleCatalog } from '@/features/demo/scenario/demoCatalogs';
import {
  demoHistoryMonths,
  forEachHistoryMonth,
  pickOne,
  randomInt,
  type DemoAmounts,
  type DemoAuthor,
  type DemoCalendar,
  type DemoRandom,
  type DemoSpacePlan,
  type DemoTransactionPlan,
} from '@/features/demo/scenario/demoScenarioTools';

type CoupleScenarioInput = {
  amounts: DemoAmounts;
  calendar: DemoCalendar;
  random: DemoRandom;
  selfName: string;
  partnerName: string;
  petName: string;
};

/**
 * La casa compartida de una pareja que convive: cada persona aporta cada mes
 * a una cuenta conjunta, y desde ahí sale el alquiler, la compra, las
 * facturas, las cenas fuera y algún viaje. Ambas registran movimientos, así
 * que la autoría alterna entre las dos.
 */
export function buildCoupleScenario({
  amounts,
  calendar,
  random,
  selfName,
  partnerName,
  petName,
}: CoupleScenarioInput): DemoSpacePlan {
  const { monthDate, isDue } = calendar;
  const transactions: DemoTransactionPlan[] = [];
  const anyone = (): DemoAuthor => (random() < 0.5 ? 'self' : 'partner');
  const add = (plan: DemoTransactionPlan) => transactions.push(plan);
  const addIfDue = (plan: Omit<DemoTransactionPlan, 'recurrence'>) => {
    if (isDue(plan.occurredOn)) add({ ...plan, recurrence: 'once' });
  };
  const start = -demoHistoryMonths;

  // Aportes y gastos fijos de la casa.
  add({
    type: 'income',
    amountMinor: amounts.round(1000),
    title: `Aporte de ${selfName}`,
    categoryKey: 'contributions',
    accountKey: 'joint',
    occurredOn: monthDate(start, 1),
    recurrence: 'monthly',
    author: 'self',
  });
  add({
    type: 'income',
    amountMinor: amounts.round(1100),
    title: `Aporte de ${partnerName}`,
    categoryKey: 'contributions',
    accountKey: 'joint',
    occurredOn: monthDate(start, 1),
    recurrence: 'monthly',
    author: 'partner',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(950),
    title: 'Alquiler',
    categoryKey: 'housing',
    accountKey: 'joint',
    occurredOn: monthDate(start, 1),
    recurrence: 'monthly',
    author: 'partner',
  });
  add({
    type: 'expense',
    amountMinor: amounts.charm(45),
    title: 'Fibra e internet',
    categoryKey: 'utilities',
    accountKey: 'joint',
    occurredOn: monthDate(start, 7),
    recurrence: 'monthly',
    author: 'self',
  });
  add({
    type: 'expense',
    amountMinor: amounts.charm(14),
    title: 'Netflix',
    categoryKey: 'subscriptions',
    accountKey: 'joint',
    occurredOn: monthDate(start, 15),
    recurrence: 'monthly',
    author: 'partner',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(38),
    title: 'Seguro del coche',
    categoryKey: 'transport',
    accountKey: 'joint',
    occurredOn: monthDate(start, 10),
    recurrence: 'monthly',
    author: 'partner',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(50),
    title: 'Gasolina',
    categoryKey: 'transport',
    accountKey: 'joint',
    occurredOn: calendar.nextWeekday(monthDate(start, 2), 5),
    recurrence: 'biweekly',
    author: 'partner',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(22),
    title: 'Mercado del sábado',
    categoryKey: 'groceries',
    accountKey: 'cash',
    occurredOn: calendar.nextWeekday(monthDate(start, 1), 6),
    recurrence: 'weekly',
    author: 'self',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(32),
    title: 'Factura del agua',
    categoryKey: 'utilities',
    accountKey: 'joint',
    occurredOn: monthDate(start, 18),
    recurrence: 'custom',
    customOccurrenceDates: [start, start + 2, start + 4, start + 6].map(
      (month) => monthDate(month, 18),
    ),
    author: 'self',
    note: 'Llega cada dos meses',
  });

  // Facturas variables, compra y vida en común.
  forEachHistoryMonth((month) => {
    addIfDue({
      type: 'expense',
      amountMinor: amounts.price(48, 92),
      title: 'Factura de la luz',
      paidInLocalCurrency: true,
      categoryKey: 'utilities',
      accountKey: 'joint',
      occurredOn: monthDate(month, 12),
      author: anyone(),
    });
    addIfDue({
      type: 'expense',
      amountMinor: amounts.price(18, 35),
      title: 'Gas',
      paidInLocalCurrency: true,
      categoryKey: 'utilities',
      accountKey: 'joint',
      occurredOn: monthDate(month, 22),
      author: anyone(),
    });

    calendar.weekdaysOfMonth(month, 4).forEach((thursday, week) => {
      addIfDue({
        type: 'expense',
        amountMinor:
          week === 0 ? amounts.price(140, 190) : amounts.price(62, 118),
        title:
          week === 0
            ? 'Compra grande del mes'
            : pickOne(random, ['Compra semanal', 'Supermercado']),
        categoryKey: 'groceries',
        accountKey: 'joint',
        occurredOn: thursday,
        author: anyone(),
      });
    });
    for (let index = randomInt(random, 2, 3); index > 0; index -= 1) {
      addIfDue({
        type: 'expense',
        amountMinor: amounts.price(5, 18),
        title: pickOne(random, ['Frutería', 'Panadería', 'Pan y leche']),
        paidInLocalCurrency: true,
        categoryKey: 'groceries',
        accountKey: 'cash',
        occurredOn: monthDate(month, randomInt(random, 1, 28)),
        author: anyone(),
      });
    }

    for (let index = randomInt(random, 2, 3); index > 0; index -= 1) {
      const isDelivery = random() < 0.3;
      addIfDue({
        type: 'expense',
        amountMinor: isDelivery ? amounts.price(18, 28) : amounts.price(32, 78),
        title: isDelivery
          ? 'Pizza a domicilio'
          : pickOne(random, [
              'Cena en el italiano',
              'Hamburguesas',
              'Comida del domingo',
              'Tapas con amigos',
            ]),
        categoryKey: 'restaurants',
        accountKey: 'joint',
        occurredOn: monthDate(month, randomInt(random, 1, 28)),
        author: anyone(),
      });
    }
    addIfDue({
      type: 'expense',
      amountMinor: amounts.price(17, 26),
      title: pickOne(random, ['Cine juntos', 'Paseo en barca', 'Escape room']),
      categoryKey: 'dates',
      accountKey: 'joint',
      occurredOn: monthDate(month, randomInt(random, 5, 27)),
      author: anyone(),
    });
    addIfDue({
      type: 'expense',
      amountMinor: amounts.price(38, 46),
      title: `Comida de ${petName}`,
      categoryKey: 'pets',
      accountKey: 'joint',
      occurredOn: monthDate(month, 3),
      author: anyone(),
    });
    if (month % 2 !== 0) {
      addIfDue({
        type: 'expense',
        amountMinor: amounts.price(15, 70),
        title: pickOne(random, [
          'Plantas para el balcón',
          'Lámpara del salón',
          'Toallas nuevas',
          'Organizadores de cocina',
        ]),
        categoryKey: 'home',
        accountKey: 'joint',
        occurredOn: monthDate(month, randomInt(random, 4, 26)),
        author: anyone(),
      });
    }
  });

  // Momentos puntuales: veterinario, una escapada y planes por venir.
  addIfDue({
    type: 'expense',
    amountMinor: amounts.round(55),
    title: 'Veterinario',
    categoryKey: 'pets',
    accountKey: 'joint',
    occurredOn: monthDate(-3, 9),
    author: 'self',
    note: `Vacunas de ${petName}`,
  });
  const trip: [string, number, DemoAuthor][] = [
    ['Hotel de la escapada', 240, 'partner'],
    ['Gasolina del viaje', 55, 'partner'],
    ['Cena frente al mar', 64, 'self'],
    ['Excursión en barco', 48, 'self'],
  ];
  trip.forEach(([title, amount, author], day) => {
    addIfDue({
      type: 'expense',
      amountMinor: amounts.round(amount),
      title,
      categoryKey: 'travel',
      accountKey: 'vacation',
      occurredOn: monthDate(-3, 14 + day),
      author,
    });
  });
  addIfDue({
    type: 'expense',
    amountMinor: amounts.round(70),
    title: 'Cena de aniversario',
    categoryKey: 'dates',
    accountKey: 'joint',
    occurredOn: monthDate(-1, 20),
    author: 'partner',
    note: 'Tres años juntos',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(140),
    title: 'Revisión del coche',
    categoryKey: 'transport',
    accountKey: 'joint',
    occurredOn: monthDate(1, 27),
    recurrence: 'once',
    author: 'partner',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(180),
    title: 'Reserva casa rural',
    categoryKey: 'travel',
    accountKey: 'vacation',
    occurredOn: monthDate(1, 5),
    recurrence: 'once',
    author: 'self',
    note: 'Escapada del puente',
  });
  add({
    type: 'expense',
    amountMinor: amounts.round(320),
    title: 'Vuelos para las fiestas',
    categoryKey: 'travel',
    accountKey: 'vacation',
    occurredOn: monthDate(2, 20),
    recurrence: 'once',
    author: 'partner',
  });

  return { ...buildCoupleCatalog(amounts), transactions };
}
