import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { CategoryColorToken } from '@/theme/categoryColors';

/**
 * El tipo solo cambia el aspecto y el icono por defecto de la tarjeta. Una
 * cuenta de crédito calcula su saldo igual que las demás y puede quedar en
 * negativo; no existe límite de crédito ni fecha de corte.
 */
export const moneyAccountKinds = [
  'cash',
  'bank',
  'debit',
  'credit',
  'savings',
] as const;

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
  /** Admite cero y negativos: una tarjeta de crédito empieza con deuda. */
  openingBalanceMinor: number;
  isArchived: boolean;
};

export type CreateMoneyAccountInput = Omit<MoneyAccount, 'id' | 'isArchived'>;
