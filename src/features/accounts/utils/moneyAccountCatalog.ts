import type { MoneyAccount } from '@/features/accounts/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

const maximumMoneyAccountNameLength = 40;

export type MoneyAccountNameValidation =
  { valid: true; name: string } | { valid: false; error: string };

export function listMoneyAccountsBySpace(
  accounts: readonly MoneyAccount[],
  spaceId: string,
): MoneyAccount[] {
  return accounts.filter(
    (account) => account.spaceId === spaceId && !account.isArchived,
  );
}

export function findMoneyAccountById(
  accounts: readonly MoneyAccount[],
  accountId: string | undefined,
): MoneyAccount | undefined {
  if (!accountId) {
    return undefined;
  }

  return accounts.find((account) => account.id === accountId);
}

export function normalizeMoneyAccountName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function moneyAccountComparisonKey(name: string): string {
  return normalizeMoneyAccountName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES');
}

export function validateMoneyAccountName(
  name: string,
  accounts: readonly MoneyAccount[],
  spaceId: string,
  excludedAccountId?: string,
): MoneyAccountNameValidation {
  const normalizedName = normalizeMoneyAccountName(name);

  if (!normalizedName) {
    return { valid: false, error: 'Escribe un nombre para la cuenta.' };
  }

  if (normalizedName.length > maximumMoneyAccountNameLength) {
    return {
      valid: false,
      error: `El nombre no puede superar ${maximumMoneyAccountNameLength} caracteres.`,
    };
  }

  const comparisonKey = moneyAccountComparisonKey(normalizedName);
  const duplicateExists = listMoneyAccountsBySpace(accounts, spaceId).some(
    (account) =>
      account.id !== excludedAccountId &&
      moneyAccountComparisonKey(account.name) === comparisonKey,
  );

  if (duplicateExists) {
    return {
      valid: false,
      error: 'Ya existe una cuenta con ese nombre en este espacio.',
    };
  }

  return { valid: true, name: normalizedName };
}

/**
 * Añade la moneda con saldo inicial cero si la cuenta todavía no la guarda.
 * Una cuenta creada para un movimiento debe poder llevarlo en su moneda.
 */
export function withCurrencyBalance(
  balances: MoneyAccount['balances'],
  currency: CurrencyCode | undefined,
): MoneyAccount['balances'] {
  return !currency || balances.some((balance) => balance.currency === currency)
    ? balances
    : [...balances, { currency, openingBalanceMinor: 0 }];
}
