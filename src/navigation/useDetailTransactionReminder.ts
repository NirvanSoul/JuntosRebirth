import { useEffect, useState } from 'react';

import type { Category } from '@/features/categories/types';
import {
  cancelTransactionReminder,
  getTransactionReminder,
  scheduleTransactionReminder,
} from '@/features/transactions/services/transactionReminderService';
import type {
  SessionTransaction,
  TransactionReminder,
} from '@/features/transactions/types';

type DetailTransactionReminderSource = {
  activeSpaceId: string;
  /** Movimiento abierto en el detalle; su recordatorio se carga al abrirlo. */
  detailTransactionId: string | undefined;
  spaceCategories: readonly Category[];
  transactions: readonly SessionTransaction[];
};

/** Recordatorio del movimiento abierto en el detalle y sus acciones. */
export function useDetailTransactionReminder({
  activeSpaceId,
  detailTransactionId,
  spaceCategories,
  transactions,
}: DetailTransactionReminderSource) {
  const [reminder, setReminder] = useState<TransactionReminder | null>(null);

  useEffect(() => {
    if (!detailTransactionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia junto al fetch con cleanup de abajo
      setReminder(null);
      return;
    }

    let isMounted = true;
    void getTransactionReminder(detailTransactionId).then((loaded) => {
      if (isMounted) setReminder(loaded);
    });

    return () => {
      isMounted = false;
    };
  }, [detailTransactionId]);

  const saveReminder = (
    transactionId: string,
    remindOn: string,
    times: readonly string[],
  ): Promise<boolean> => {
    const source = transactions.find((t) => t.id === transactionId);
    if (!source || source.spaceId !== activeSpaceId) {
      return Promise.resolve(false);
    }

    const categoryName = spaceCategories.find(
      (category) => category.id === source.categoryId,
    )?.name;

    return scheduleTransactionReminder({
      remindOn,
      spaceId: activeSpaceId,
      times,
      transaction: { ...source, categoryName },
    })
      .then((scheduled) => {
        setReminder(scheduled);
        return true;
      })
      .catch(() => false);
  };

  const removeReminder = (transactionId: string): Promise<boolean> =>
    cancelTransactionReminder(transactionId)
      .then(() => {
        setReminder(null);
        return true;
      })
      .catch(() => false);

  return {
    clearReminder: () => setReminder(null),
    reminder,
    removeReminder,
    saveReminder,
  };
}
