import type { SessionTransaction } from '@/features/transactions/types';
import {
  parseProjectedTransactionId,
  projectRecurringTransactions,
} from '@/features/transactions/utils/transactionRecurrence';

export function resolveTransactionForDetail(
  transactions: readonly SessionTransaction[],
  transactionId: string | null,
): SessionTransaction | null {
  if (!transactionId) return null;

  const persisted = transactions.find(
    (transaction) => transaction.id === transactionId,
  );
  if (persisted) return persisted;

  const projectedIdentity = parseProjectedTransactionId(transactionId);
  if (!projectedIdentity) return null;

  return (
    projectRecurringTransactions({
      transactions,
      startOn: projectedIdentity.occurredOn,
      endOn: projectedIdentity.occurredOn,
    }).find((transaction) => transaction.id === transactionId) ?? null
  );
}
