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
   * Moneda de la cuenta. Elegir una cuenta al registrar un movimiento fija
   * esta moneda, de modo que un saldo nunca mezcla divisas.
   */
  currency: CurrencyCode;
  /** Admite cero y negativos: quien arrastra una deuda escribe el signo. */
  openingBalanceMinor: number;
  isArchived: boolean;
};

export type CreateMoneyAccountInput = Omit<MoneyAccount, 'id' | 'isArchived'>;
