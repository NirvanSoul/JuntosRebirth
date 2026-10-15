import { useCallback, useRef, useState } from 'react';

import type { MoneyAccount } from '@/features/accounts/types';
import { moneyAccountSupportsCurrency } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';

type TransactionDetailModalSource = {
  assignableMoneyAccounts: readonly MoneyAccount[];
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

  const open = useCallback(
    (nextTransactionId: string) => {
      const nextTransaction = resolveTransactionForDetail(
        transactions,
        nextTransactionId,
      );
      if (!nextTransaction) return;

      setTransactionId(nextTransactionId);
      setRetainedTransaction(nextTransaction);
      setVisible(true);
    },
    [transactions],
  );
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
      ? assignableMoneyAccounts.filter((account) =>
          moneyAccountSupportsCurrency(account, transaction.currency),
        )
      : [],
    open,
    setTransactionId,
    transaction,
    visible,
  };
}
