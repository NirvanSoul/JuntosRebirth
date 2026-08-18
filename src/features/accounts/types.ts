import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { CategoryColorToken } from '@/theme/categoryColors';

/**
 * Tres tipos y no más: son los que la gente distingue sin pensarlo. El tipo
 * solo propone el icono y el color al crear la cuenta; el saldo se calcula
 * igual en los tres y puede quedar en negativo.
 */
export const moneyAccountKinds = ['cash', 'bank', 'card'] as const;

export type MoneyAccountKind = (typeof moneyAccountKinds)[number];

/**
 * Catálogo cerrado propio: los iconos de categoría describen en qué se gasta
 * el dinero y los de cuenta, dónde está guardado. Mezclarlos obligaría a
 * enseñar «paw-print» al elegir una cuenta bancaria.
 */
export const moneyAccountIconNames = [
  'wallet',
  'bank',
  'credit-card',
  'piggy-bank',
  'money',
  'coins',
  'vault',
  'hand-coins',
  'currency-circle-dollar',
  'buildings',
] as const;

export type MoneyAccountIconName = (typeof moneyAccountIconNames)[number];

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
