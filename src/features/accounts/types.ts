import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { CategoryColorToken } from '@/theme/categoryColors';
import {
  categoryIconSections,
  type CategoryIconName,
} from '@/features/categories/types';

/**
 * Tres tipos y no más: son los que la gente distingue sin pensarlo. El tipo
 * solo propone el icono y el color al crear la cuenta; el saldo se calcula
 * igual en los tres y puede quedar en negativo.
 */
export const moneyAccountKinds = ['cash', 'bank', 'card'] as const;

export type MoneyAccountKind = (typeof moneyAccountKinds)[number];

/** Iconos que describen de forma directa dónde se guarda el dinero. */
const moneyAccountSpecificIconSections = [
  {
    title: 'Cuentas y ahorro',
    icons: [
      'bank',
      'buildings',
      'vault',
      'piggy-bank',
      'lock-key',
      'shield-check',
    ],
  },
  {
    title: 'Dinero',
    icons: [
      'money',
      'coins',
      'hand-coins',
      'cash-register',
      'calculator',
      'receipt',
    ],
  },
  {
    title: 'Tarjetas y pagos',
    icons: [
      'credit-card',
      'cardholder',
      'wallet',
      'device-mobile',
      'phone',
      'barcode',
    ],
  },
] as const;

type MoneyAccountSpecificIconName =
  (typeof moneyAccountSpecificIconSections)[number]['icons'][number];

const specificIconNames = new Set<string>(
  moneyAccountSpecificIconSections.flatMap(({ icons }) => icons),
);

/**
 * Primero aparecen los iconos propios de cuentas. Después se ofrecen los
 * iconos de categoría que aún no estaban disponibles, para dar más libertad
 * al personalizar una cuenta sin repetir opciones.
 */
export const moneyAccountIconSections: readonly {
  title: string;
  icons: readonly MoneyAccountIconName[];
}[] = [
  ...moneyAccountSpecificIconSections,
  ...categoryIconSections.map(({ title, icons }) => ({
    title,
    icons: icons.filter((icon) => !specificIconNames.has(icon)),
  })),
];

export type MoneyAccountIconName =
  MoneyAccountSpecificIconName | CategoryIconName;

export const moneyAccountIconNames: readonly MoneyAccountIconName[] =
  moneyAccountIconSections.flatMap(({ icons }) => icons);

export type MoneyAccount = {
  id: string;
  spaceId: string;
  name: string;
  kind: MoneyAccountKind;
  icon: MoneyAccountIconName;
  colorToken: CategoryColorToken;
  /**
   * Monedas de la cuenta, con el saldo inicial de cada una. Nunca está vacía y
   * la primera actúa de principal: encabeza la tarjeta y es la que se propone
   * al registrar un movimiento.
   *
   * Un banco puede guardar varias divisas en la misma cuenta, pero cada una
   * lleva su propio saldo: sumarlas no significaría nada.
   */
  balances: readonly MoneyAccountBalance[];
  isArchived: boolean;
};

export type MoneyAccountBalance = {
  currency: CurrencyCode;
  /** Admite cero y negativos: quien arrastra una deuda escribe el signo. */
  openingBalanceMinor: number;
};

export type CreateMoneyAccountInput = Omit<MoneyAccount, 'id' | 'isArchived'>;

/** La primera moneda: la que encabeza la tarjeta y se propone por defecto. */
export function getPrimaryMoneyAccountCurrency(
  account: Pick<MoneyAccount, 'balances'>,
): CurrencyCode {
  const primary = account.balances[0];

  if (!primary) {
    throw new Error('La cuenta no tiene ninguna moneda asociada');
  }

  return primary.currency;
}

export function moneyAccountSupportsCurrency(
  account: Pick<MoneyAccount, 'balances'>,
  currency: CurrencyCode,
): boolean {
  return account.balances.some((balance) => balance.currency === currency);
}
