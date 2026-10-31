import { useMemo } from 'react';

import {
  TransactionFiltersModal,
  type TransactionFilters,
} from '@/features/activity/components/TransactionFiltersModal';
import type { useTransactionAuthorFilter } from '@/features/activity/hooks/useTransactionAuthorFilter';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

type TransactionAuthorFiltersModalProps = {
  authorFilter: ReturnType<typeof useTransactionAuthorFilter>;
  currency: CurrencyCode;
  onClose: () => void;
  visible: boolean;
};

/** Filtros reducidos al autor, para listados cuyo periodo se elige fuera. */
export function TransactionAuthorFiltersModal({
  authorFilter: { author, authorOptions, setAuthor },
  currency,
  onClose,
  visible,
}: TransactionAuthorFiltersModalProps) {
  // Referencia estable: el modal reinicia su borrador cuando cambia `filters`.
  const filters = useMemo<TransactionFilters>(
    () => ({
      author,
      category: [],
      currency,
      date: 'all',
      recurrence: 'all',
      type: 'all',
    }),
    [author, currency],
  );

  return (
    <TransactionFiltersModal
      authorOptions={authorOptions}
      categories={[]}
      currencies={[currency]}
      filters={filters}
      onApply={(nextFilters) => {
        setAuthor(nextFilters.author ?? 'all');
        onClose();
      }}
      onClose={onClose}
      variant="author"
      visible={visible}
    />
  );
}
