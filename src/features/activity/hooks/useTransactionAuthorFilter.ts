import { useCallback, useMemo } from 'react';

import type { TransactionAuthorFilter } from '@/features/activity/components/TransactionFiltersModal';
import {
  getTransactionAuthorFilterOptions,
  matchesTransactionAuthorFilter,
} from '@/features/activity/utils/transactionAuthorFilter';
import { useSpaceMembership } from '@/features/profile/state/SpaceMembershipContext';
import type { SessionTransaction } from '@/features/transactions/types';
import { useSessionState } from '@/hooks/useSessionState';

/**
 * Estado del filtro de autor de un listado de movimientos. En un espacio
 * personal no hay opciones y el filtro deja pasar todo. Con `sessionKey`, el
 * autor elegido se conserva entre pantallas hasta que se cierra la app.
 */
export function useTransactionAuthorFilter(
  initialAuthor: TransactionAuthorFilter = 'all',
  sessionKey: string | null = null,
) {
  const membership = useSpaceMembership();
  const [author, setAuthor] = useSessionState<TransactionAuthorFilter>(
    sessionKey,
    initialAuthor,
  );
  const authorOptions = useMemo(
    () => getTransactionAuthorFilterOptions(membership),
    [membership],
  );
  const matchesAuthor = useCallback(
    (transaction: SessionTransaction) =>
      matchesTransactionAuthorFilter(transaction, author, membership),
    [author, membership],
  );

  return {
    author,
    authorOptions,
    isActive: membership.isSharedSpace && author !== 'all',
    isSharedSpace: membership.isSharedSpace,
    matchesAuthor,
    setAuthor,
  };
}
