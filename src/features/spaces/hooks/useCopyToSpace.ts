import { copyCategoryToSpace } from '@/features/categories/services/copyCategoryToSpace';
import type { Category } from '@/features/categories/types';
import { copyTransactionToSpace } from '@/features/transactions/services/copyTransactionToSpace';
import type { AnnounceMovement } from '@/features/transactions/hooks/useMovementNotice';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  getTransactionCopyKey,
  indexCopiedTransactionSpaces,
} from '@/features/transactions/utils/transactionCopyIdentity';
import type { Space } from '@/features/spaces/types';

type UseCopyToSpaceInput = {
  activeSpaceId: string;
  /** Muestra la tarjeta de confirmación compartida con otros movimientos. */
  announce: AnnounceMovement;
  categories: readonly Category[];
  onCategoryCopied: (category: Category) => void;
  onChangesPublished: (targetSpaceId: string) => void;
  onError: () => void;
  onTransactionsCopied: (transactions: readonly SessionTransaction[]) => void;
  spaces: readonly Space[];
  transactions: readonly SessionTransaction[];
};

/**
 * Copia de categorías y movimientos hacia otro espacio, con su tarjeta
 * flotante de confirmación.
 */
export function useCopyToSpace({
  activeSpaceId,
  announce,
  categories,
  onCategoryCopied,
  onChangesPublished,
  onError,
  onTransactionsCopied,
  spaces,
  transactions,
}: UseCopyToSpaceInput) {
  const copyCategory = async (
    categoryId: string,
    targetSpaceId: string,
  ): Promise<boolean> => {
    const targetSpace = spaces.find((space) => space.id === targetSpaceId);
    if (!targetSpace) return false;

    try {
      const result = await copyCategoryToSpace({
        categories,
        categoryId,
        sourceSpaceId: activeSpaceId,
        targetSpaceId,
      });
      if (result.status === 'rejected') return false;

      onCategoryCopied(result.copiedCategory);
      onChangesPublished(targetSpaceId);
      announce({
        category: result.copiedCategory,
        message: 'Categoría copiada',
        placement: 'bottom',
        tone: 'success',
      });
      return true;
    } catch {
      onError();
      return false;
    }
  };

  /**
   * Copia uno o varios movimientos. Varios van uno tras otro, con las
   * categorías que crean las copias anteriores, y comparten un solo aviso.
   *
   * Nunca duplica en el destino: de una serie automática solo viaja la
   * repetición más antigua elegida (la copia ya crea la serie desde ahí) y se
   * omite lo que ya existe en el destino por una copia anterior.
   */
  const copyTransaction = async (
    transactionIds: string | readonly string[],
    targetSpaceId: string,
  ): Promise<boolean> => {
    const targetSpace = spaces.find((space) => space.id === targetSpaceId);
    if (!targetSpace) return false;
    const ids =
      typeof transactionIds === 'string' ? [transactionIds] : transactionIds;
    const categoryIds = new Set(
      ids.map(
        (id) =>
          transactions.find((transaction) => transaction.id === id)?.categoryId,
      ),
    );
    const [sourceCategoryId] = categoryIds;
    const category =
      categoryIds.size === 1
        ? categories.find(({ id }) => id === sourceCategoryId)
        : undefined;
    const copiedSpaceIds = indexCopiedTransactionSpaces(transactions);
    const pending = new Map<string, SessionTransaction>();
    for (const id of ids) {
      const source = transactions.find((transaction) => transaction.id === id);
      if (!source || copiedSpaceIds(source).has(targetSpaceId)) continue;
      const key = getTransactionCopyKey(source);
      const current = pending.get(key);
      if (!current || source.occurredOn < current.occurredOn) {
        pending.set(key, source);
      }
    }
    let knownCategories = categories;
    let copiedCount = 0;

    try {
      for (const source of pending.values()) {
        const result = await copyTransactionToSpace({
          categories: knownCategories,
          sourceSpaceId: activeSpaceId,
          targetSpaceId,
          transactionId: source.id,
          transactions,
        });
        if (result.status === 'rejected') continue;

        if (result.createdCategory) {
          knownCategories = [...knownCategories, result.createdCategory];
          onCategoryCopied(result.createdCategory);
        }
        onTransactionsCopied(result.copiedTransactions);
        copiedCount += 1;
      }
    } catch {
      onError();
    }
    if (copiedCount === 0) return false;

    onChangesPublished(targetSpaceId);
    announce({
      category,
      message:
        copiedCount === 1
          ? 'Movimiento copiado'
          : `${copiedCount} movimientos copiados`,
      placement: 'bottom',
      tone: 'success',
    });
    return copiedCount === pending.size;
  };

  return { copyCategory, copyTransaction };
}
