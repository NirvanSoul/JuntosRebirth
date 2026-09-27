import { useMemo } from 'react';

import type { TransactionFilters } from '@/features/activity/components/TransactionFiltersModal';
import { matchesTransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  resolveTransactionAuthor,
  type TransactionAuthorContext,
} from '@/features/transactions/utils/transactionAuthor';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalTodayKey } from '@/lib/date/localDate';

type CategoryDetailTransactions = {
  /** Movimientos del espacio tras aplicar el filtro de autor. */
  authorFilteredTransactions: readonly SessionTransaction[];
  /** Movimientos de la categoría hasta el mes en curso. */
  categoryTransactions: readonly SessionTransaction[];
  pastCategoryTransactions: readonly SessionTransaction[];
  upcomingCategoryTransactions: readonly SessionTransaction[];
};

/**
 * Selecciona los movimientos que muestra el detalle de una categoría: filtra
 * por autor, moneda y fecha, y separa los pasados de los futuros.
 */
export function useCategoryDetailTransactions({
  category,
  filters,
  isSharedSpace,
  membership,
  selectedCurrency,
  transactions,
  venezuelaCurrencyMode,
}: {
  category: Category | null;
  filters: TransactionFilters;
  isSharedSpace: boolean;
  membership: TransactionAuthorContext;
  selectedCurrency: CurrencyCode;
  transactions: readonly SessionTransaction[];
  venezuelaCurrencyMode: boolean;
}): CategoryDetailTransactions {
  const authorFilteredTransactions = useMemo(() => {
    if (filters.author === 'all' || !isSharedSpace) return transactions;

    return transactions.filter(
      (transaction) =>
        resolveTransactionAuthor(transaction.createdBy, membership).isOwn ===
        (filters.author === 'own'),
    );
  }, [filters.author, isSharedSpace, membership, transactions]);
  const matchesCategory = useMemo(
    () => (transaction: SessionTransaction) =>
      category !== null &&
      transaction.categoryId === category.id &&
      (venezuelaCurrencyMode || transaction.currency === selectedCurrency),
    [category, selectedCurrency, venezuelaCurrencyMode],
  );
  const categoryTransactions = useMemo(
    () =>
      listTransactionsThroughCurrentMonth(authorFilteredTransactions).filter(
        matchesCategory,
      ),
    [authorFilteredTransactions, matchesCategory],
  );
  const allCategoryTransactions = useMemo(
    () => authorFilteredTransactions.filter(matchesCategory),
    [authorFilteredTransactions, matchesCategory],
  );
  const todayKey = getLocalTodayKey();
  const pastCategoryTransactions = useMemo(
    () =>
      categoryTransactions.filter(
        (transaction) =>
          transaction.occurredOn <= todayKey &&
          matchesTransactionDateFilter(transaction.occurredOn, filters.date),
      ),
    [categoryTransactions, filters.date, todayKey],
  );
  const upcomingCategoryTransactions = useMemo(() => {
    const seenIds = new Set<string>();
    const upcoming: SessionTransaction[] = [];
    for (const transaction of [
      ...allCategoryTransactions,
      ...categoryTransactions,
    ]) {
      if (
        transaction.occurredOn <= todayKey ||
        !matchesTransactionDateFilter(transaction.occurredOn, filters.date) ||
        seenIds.has(transaction.id)
      )
        continue;
      seenIds.add(transaction.id);
      upcoming.push(transaction);
    }
    return upcoming.sort((left, right) =>
      left.occurredOn.localeCompare(right.occurredOn),
    );
  }, [allCategoryTransactions, categoryTransactions, filters.date, todayKey]);

  return {
    authorFilteredTransactions,
    categoryTransactions,
    pastCategoryTransactions,
    upcomingCategoryTransactions,
  };
}
