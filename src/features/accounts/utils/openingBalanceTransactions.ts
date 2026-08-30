import type { MoneyAccountBalance } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { CreateTransactionDraft } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/**
 * Convierte el saldo declarado al crear una cuenta en actividad financiera.
 * La cuenta empieza con saldo persistido cero: el movimiento es la única
 * fuente que alimenta tanto su saldo como el balance global.
 */
export function createOpeningBalanceTransactions({
  accountId,
  accountName,
  balances,
  categories,
  occurredOn,
  spaceId,
}: {
  accountId: string;
  accountName: string;
  balances: readonly MoneyAccountBalance[];
  categories: readonly Category[];
  occurredOn: string;
  spaceId: string;
}): CreateTransactionDraft[] {
  const balancesWithAmount = balances.filter(
    (balance) => balance.openingBalanceMinor !== 0,
  );
  if (balancesWithAmount.length === 0) return [];

  // «Otros» evita atribuir un saldo ya existente a una categoría de gasto o
  // ingreso concreta. El fallback conserva el flujo si ese catálogo fue
  // personalizado.
  const category =
    categories.find((candidate) => candidate.templateKey === 'other') ??
    categories[0];
  if (!category) {
    throw new Error('Hace falta una categoría para registrar el saldo inicial');
  }

  return balancesWithAmount.map((balance) =>
    createOpeningBalanceTransaction({
      accountId,
      accountName,
      amountMinor: balance.openingBalanceMinor,
      categoryId: category.id,
      currency: balance.currency,
      occurredOn,
      spaceId,
    }),
  );
}

function createOpeningBalanceTransaction({
  accountId,
  accountName,
  amountMinor,
  categoryId,
  currency,
  occurredOn,
  spaceId,
}: {
  accountId: string;
  accountName: string;
  amountMinor: number;
  categoryId: string;
  currency: CurrencyCode;
  occurredOn: string;
  spaceId: string;
}): CreateTransactionDraft {
  return {
    spaceId,
    categoryId,
    moneyAccountId: accountId,
    currency,
    amountMinor: Math.abs(amountMinor),
    type: amountMinor < 0 ? 'expense' : 'income',
    title: `Saldo inicial · ${accountName}`,
    occurredOn,
    recurrence: 'once',
  };
}
