import { getDemoCurrencyProfile } from '@/features/demo/constants/demoCurrencyProfiles';
import { buildCoupleScenario } from '@/features/demo/scenario/demoCoupleScenario';
import { buildPersonalScenario } from '@/features/demo/scenario/demoPersonalScenario';
import {
  createDemoAmounts,
  createDemoCalendar,
  createDemoRandom,
  pickOne,
  type DemoSpacePlan,
} from '@/features/demo/scenario/demoScenarioTools';
import { usdMinorToDemoVesMinor } from '@/features/demo/utils/demoVenezuelaRates';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/** Parejas que conviven; quien usa el demo es una de las dos personas. */
const demoCouples: readonly (readonly [string, string])[] = [
  ['Angélica', 'Manuel'],
  ['Lucía', 'Daniel'],
  ['Valeria', 'Andrés'],
  ['Camila', 'Diego'],
  ['Sofía', 'Javier'],
  ['Paula', 'Mateo'],
];
const demoPetNames = ['Luna', 'Coco', 'Toby', 'Nala'] as const;
export const demoCoupleSpaceName = 'Nuestro hogar';
const utilitiesSubsidy = 0.35;

export type DemoScenario = {
  /** Moneda contable: la de cuentas, espacios y movimientos sin `currency`. */
  currency: CurrencyCode;
  activeCurrencies: readonly CurrencyCode[];
  countryCode: string;
  /** Perfil venezolano: sus movimientos llevan snapshot de tasas. */
  isVenezuela: boolean;
  selfName: string;
  partnerName: string;
  coupleSpaceName: string;
  personal: DemoSpacePlan;
  couple: DemoSpacePlan;
};

/**
 * Guion completo del usuario demo. Es puro: con la misma moneda, fecha y
 * semilla produce exactamente los mismos datos, y no toca almacenamiento.
 */
export function buildDemoScenario(input: {
  currency: CurrencyCode;
  /** Hoy en clave local `YYYY-MM-DD`. */
  today: string;
  seed: number;
}): DemoScenario {
  const { accountingCurrency, activeCurrencies, countryCode, costScale } =
    getDemoCurrencyProfile(input.currency);
  const isVenezuela = countryCode === 'VE';
  const random = createDemoRandom(input.seed);
  const amounts = createDemoAmounts(costScale, random);
  const calendar = createDemoCalendar(input.today);
  const names = pickOne(random, demoCouples);
  const [selfName, partnerName] =
    random() < 0.5 ? [names[0], names[1]] : [names[1], names[0]];

  const personal = buildPersonalScenario({
    amounts,
    calendar,
    random,
    coupleSpaceName: demoCoupleSpaceName,
  });
  const couple = buildCoupleScenario({
    amounts,
    calendar,
    random,
    selfName,
    partnerName,
    petName: pickOne(random, demoPetNames),
  });

  return {
    currency: accountingCurrency,
    activeCurrencies,
    countryCode,
    isVenezuela,
    selfName,
    partnerName,
    coupleSpaceName: demoCoupleSpaceName,
    personal: isVenezuela ? payInBolivars(personal) : personal,
    couple: isVenezuela ? payInBolivars(couple) : couple,
  };
}

/**
 * En Venezuela las compras pequeñas se pagan en bolívares a la tasa del día.
 * Las cuentas venezolanas solo tienen saldo en USD, así que esos movimientos
 * quedan sin cuenta, como un pago en efectivo en bolívares.
 */
function payInBolivars(plan: DemoSpacePlan): DemoSpacePlan {
  return {
    ...plan,
    transactions: plan.transactions.map((transaction) => {
      if (!transaction.paidInLocalCurrency) return transaction;
      const { accountKey: _accountKey, ...rest } = transaction;
      // Luz y gas están subsidiados: cuestan una fracción de lo habitual.
      const factor =
        transaction.categoryKey === 'utilities' ? utilitiesSubsidy : 1;
      return {
        ...rest,
        currency: 'VES',
        amountMinor: usdMinorToDemoVesMinor(
          Math.round(transaction.amountMinor * factor),
          transaction.occurredOn,
        ),
      };
    }),
  };
}
