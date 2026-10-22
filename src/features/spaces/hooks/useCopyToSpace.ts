import { useRef, useState } from 'react';

import type { ToastNotice } from '@/components/overlays/NoticeToast/NoticeToast';
import { copyCategoryToSpace } from '@/features/categories/services/copyCategoryToSpace';
import type { Category } from '@/features/categories/types';
import { copyTransactionToSpace } from '@/features/transactions/services/copyTransactionToSpace';
import type { SessionTransaction } from '@/features/transactions/types';
import type { Space } from '@/features/spaces/types';

/** Aviso de copia; los movimientos llevan el icono de su categoría. */
export type CopyNotice = ToastNotice & {
  category?: Pick<Category, 'colorToken' | 'icon'>;
};

type UseCopyToSpaceInput = {
  activeSpaceId: string;
  categories: readonly Category[];
  onCategoryCopied: (category: Category) => void;
  onChangesPublished: (targetSpaceId: string) => void;
  onError: () => void;
  onTransactionsCopied: (transactions: readonly SessionTransaction[]) => void;
  spaces: readonly Space[];
  transactions: readonly SessionTransaction[];
};

/**
 * Copia de categorías y movimientos hacia otro espacio, con la tarjeta
 * flotante de confirmación que ambas comparten.
 */
export function useCopyToSpace({
  activeSpaceId,
  categories,
  onCategoryCopied,
  onChangesPublished,
  onError,
  onTransactionsCopied,
  spaces,
  transactions,
}: UseCopyToSpaceInput) {
  const [notice, setNotice] = useState<CopyNotice | null>(null);
  const nextNoticeId = useRef(1);

  const announce = (nextNotice: Omit<CopyNotice, 'id'>) => {
    setNotice({ ...nextNotice, id: nextNoticeId.current });
    nextNoticeId.current += 1;
  };

  const dismissNotice = (noticeId: number) => {
    setNotice((current) => (current?.id === noticeId ? null : current));
  };

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
        message: `${result.itemName} copiado en ${targetSpace.name} `,
        emphasis: 'exitosamente.',
        tone: 'success',
      });
      return true;
    } catch {
      onError();
      return false;
    }
  };

  const copyTransaction = async (
    transactionId: string,
    targetSpaceId: string,
  ): Promise<boolean> => {
    const targetSpace = spaces.find((space) => space.id === targetSpaceId);
    if (!targetSpace) return false;
    const sourceCategoryId = transactions.find(
      (transaction) => transaction.id === transactionId,
    )?.categoryId;
    const category = categories.find(({ id }) => id === sourceCategoryId);

    try {
      const result = await copyTransactionToSpace({
        categories,
        sourceSpaceId: activeSpaceId,
        targetSpaceId,
        transactionId,
        transactions,
      });
      if (result.status === 'rejected') return false;

      if (result.createdCategory) onCategoryCopied(result.createdCategory);
      onTransactionsCopied(result.copiedTransactions);
      onChangesPublished(targetSpaceId);
      announce({
        category,
        message: 'Movimiento copiado',
        placement: 'bottom',
        tone: 'success',
      });
      return true;
    } catch {
      onError();
      return false;
    }
  };

  return { copyCategory, copyTransaction, dismissNotice, notice };
}
