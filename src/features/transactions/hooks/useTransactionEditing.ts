import { useCallback } from 'react';

import type { Category } from '@/features/categories/types';
import {
  listLocalTransactions,
  updateLocalTransaction,
} from '@/features/transactions/repositories/localTransactionRepository';
import type {
  CreateTransactionDraft,
  SessionTransaction,
  TransactionQuickEdit,
} from '@/features/transactions/types';
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';
import { applyTransactionQuickEdit } from '@/features/transactions/utils/transactionQuickEdit';
import { parseProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';
import { reconcileNotificationRules } from '@/features/transactions/services/notificationRuleService';

type UseTransactionEditingInput = {
  categories: readonly Category[];
  onError: () => void;
  /** Sube los cambios al espacio compartido tras cada mutación local. */
  onChangesPublished: () => void;
  /** Reapunta el detalle abierto cuando el movimiento cambia de id. */
  setDetailTransactionId: (transactionId: string) => void;
  setTransactions: (
    update: (current: SessionTransaction[]) => SessionTransaction[],
  ) => void;
  spaceTransactions: readonly SessionTransaction[];
};

/**
 * Guardado de un movimiento ya existente, compartido por el formulario
 * completo y por los cambios puntuales del detalle.
 *
 * Existe un solo camino a propósito: series recurrentes, ocurrencias
 * proyectadas, recordatorios y autoría se resuelven en `updateLocalTransaction`
 * (`DATABASE.md` §8), y un UPDATE por campo desde el detalle habría creado una
 * segunda regla que se desincroniza con la primera.
 */
export function useTransactionEditing({
  categories,
  onChangesPublished,
  onError,
  setDetailTransactionId,
  setTransactions,
  spaceTransactions,
}: UseTransactionEditingInput) {
  /**
   * Devuelve el movimiento guardado —cuyo id cambia cuando una ocurrencia
   * proyectada se materializa— o `null` si el guardado falló.
   */
  const applyTransactionUpdate = useCallback(
    async (
      transactionId: string,
      draft: CreateTransactionDraft,
    ): Promise<SessionTransaction | null> => {
      try {
        const wasProjected = Boolean(
          parseProjectedTransactionId(transactionId),
        );
        const updatedTransactions = await updateLocalTransaction(
          transactionId,
          draft,
        );
        let nextTransactions: SessionTransaction[] = [];
        if (wasProjected) {
          // Materializar una ocurrencia reescribe la serie entera, así que la
          // lista se relee en vez de fusionar las filas devueltas.
          const reloaded = await listLocalTransactions();
          nextTransactions = reloaded;
          setTransactions(() => reloaded);
        } else {
          const updatedTransactionIds = new Set(
            updatedTransactions.map((transaction) => transaction.id),
          );
          setTransactions((current) => {
            nextTransactions = [
              ...updatedTransactions,
              ...current.filter(
                (transaction) => !updatedTransactionIds.has(transaction.id),
              ),
            ];
            return nextTransactions;
          });
        }
        void reconcileNotificationRules({
          categories,
          transactions: nextTransactions,
        }).catch(() => undefined);
        onChangesPublished();

        return updatedTransactions[0] ?? null;
      } catch (error) {
        console.error('[useTransactionEditing] updateLocalTransaction', error);
        onError();

        return null;
      }
    },
    [categories, onChangesPublished, onError, setTransactions],
  );

  /**
   * Cambio puntual desde el detalle: se guarda y el usuario se queda donde
   * estaba. Si la ocurrencia era proyectada, el detalle pasa a apuntar a la
   * fila que acaba de materializarse para no cerrarse solo.
   */
  const quickEditTransaction = useCallback(
    async (transactionId: string, change: TransactionQuickEdit) => {
      const transaction = resolveTransactionForDetail(
        spaceTransactions,
        transactionId,
      );
      if (!transaction) return;

      const updated = await applyTransactionUpdate(
        transactionId,
        applyTransactionQuickEdit(transaction, change),
      );
      if (updated && updated.id !== transactionId) {
        setDetailTransactionId(updated.id);
      }
    },
    [applyTransactionUpdate, setDetailTransactionId, spaceTransactions],
  );

  return { applyTransactionUpdate, quickEditTransaction };
}
