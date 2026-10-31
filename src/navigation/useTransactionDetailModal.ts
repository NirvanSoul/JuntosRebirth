import { useCallback, useEffect, useRef, useState } from 'react';

import type { MoneyAccount } from '@/features/accounts/types';
import { listMoneyAccountsForCurrency } from '@/features/accounts/types';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';
import { useStableCallback } from '@/hooks/useStableCallback';

type TransactionDetailModalSource = {
  assignableMoneyAccounts: readonly MoneyAccountSummary[];
  categories: readonly Category[];
  moneyAccounts: readonly MoneyAccount[];
  transactions: readonly SessionTransaction[];
};

export function useTransactionDetailModal({
  assignableMoneyAccounts,
  categories,
  moneyAccounts,
  transactions,
}: TransactionDetailModalSource) {
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [retainedTransaction, setRetainedTransaction] =
    useState<SessionTransaction | null>(null);
  const [visible, setVisible] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const liveTransaction = resolveTransactionForDetail(
    transactions,
    transactionId,
  );
  const transaction = liveTransaction ?? retainedTransaction;

  const pendingTransactionIdRef = useRef<string | null>(null);

  // Estable y con la lista más reciente: quien la llamó puede tener una
  // versión de `open` de antes de cambiar de espacio.
  const showTransaction = useStableCallback((nextTransactionId: string) => {
    const nextTransaction = resolveTransactionForDetail(
      transactions,
      nextTransactionId,
    );
    if (!nextTransaction) return false;

    setTransactionId(nextTransactionId);
    setRetainedTransaction(nextTransaction);
    setVisible(true);
    return true;
  });

  /**
   * Quien abre un movimiento justo después de cambiar de espacio puede llegar
   * antes de que la lista de este espacio se actualice: en ese caso se
   * reintenta una sola vez, con la siguiente lista.
   */
  const open = useCallback(
    (nextTransactionId: string) => {
      pendingTransactionIdRef.current = showTransaction(nextTransactionId)
        ? null
        : nextTransactionId;
    },
    [showTransaction],
  );

  useEffect(() => {
    const pendingTransactionId = pendingTransactionIdRef.current;
    if (!pendingTransactionId) return;
    pendingTransactionIdRef.current = null;
    showTransaction(pendingTransactionId);
  }, [showTransaction, transactions]);
  const close = useCallback(() => setVisible(false), []);
  const closeThenRun = useCallback((action: () => void) => {
    pendingActionRef.current = action;
    setVisible(false);
  }, []);
  const handleDismissed = useCallback(() => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    setTransactionId(null);
    setRetainedTransaction(null);
    pendingAction?.();
  }, []);

  return {
    close,
    closeThenRun,
    handleDismissed,
    category: transaction
      ? (categories.find((item) => item.id === transaction.categoryId) ?? null)
      : null,
    moneyAccount: transaction
      ? (moneyAccounts.find((item) => item.id === transaction.moneyAccountId) ??
        null)
      : null,
    moneyAccountOptions: transaction
      ? listMoneyAccountsForCurrency(
          assignableMoneyAccounts,
          transaction.currency,
        )
      : [],
    open,
    setTransactionId,
    transaction,
    visible,
  };
}
