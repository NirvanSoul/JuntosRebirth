import { useCallback, useRef, useState } from 'react';

import type { ToastNotice } from '@/components/overlays/NoticeToast/NoticeToast';
import type { MoneyAccount } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { useStableCallback } from '@/hooks/useStableCallback';
import { motion } from '@/theme/motion';

/**
 * Aviso inferior de movimientos; puede llevar el icono de su categoría o, al
 * crear una cuenta, el de la cuenta.
 */
export type MovementNotice = ToastNotice & {
  category?: Pick<Category, 'colorToken' | 'icon'>;
  moneyAccount?: Pick<MoneyAccount, 'colorToken' | 'icon'>;
};

export type AnnounceMovement = (notice: Omit<MovementNotice, 'id'>) => void;

export type DeletedItem = 'transaction' | 'category' | 'moneyAccount';

const deletedItemMessages: Record<DeletedItem, string> = {
  transaction: 'Movimiento eliminado',
  category: 'Categoría eliminada',
  moneyAccount: 'Cuenta eliminada',
};

/**
 * Tarjeta flotante única para confirmar movimientos creados, copiados o
 * eliminados (también categorías y cuentas eliminadas, y cuentas creadas): un
 * aviso nuevo sustituye al anterior en lugar de apilarse. Tocar la de un
 * movimiento creado abre su detalle con `openTransactionDetail`.
 */
export function useMovementNotice(
  openTransactionDetail: (transactionId: string) => void,
) {
  const [notice, setNotice] = useState<MovementNotice | null>(null);
  const nextNoticeId = useRef(1);
  // La tarjeta se toca después de guardar: debe ver ya el movimiento nuevo.
  const openDetail = useStableCallback(openTransactionDetail);

  const announce = useCallback<AnnounceMovement>((nextNotice) => {
    setNotice({
      durationMs: motion.movementNoticeVisibleDuration,
      ...nextNotice,
      id: nextNoticeId.current,
    });
    nextNoticeId.current += 1;
  }, []);

  const dismissNotice = useCallback((noticeId: number) => {
    setNotice((current) => (current?.id === noticeId ? null : current));
  }, []);

  const announceCreated = useCallback(
    (
      created: readonly SessionTransaction[],
      category: Pick<Category, 'colorToken' | 'icon'>,
    ) => announce(createdMovementNotice(created, category, openDetail)),
    [announce, openDetail],
  );

  const announceDeleted = useCallback(
    (item: DeletedItem) =>
      announce({
        message: deletedItemMessages[item],
        placement: 'bottom',
        tone: 'success',
      }),
    [announce],
  );

  const announceCreatedMoneyAccount = useCallback(
    (account: Pick<MoneyAccount, 'colorToken' | 'icon' | 'name'>) =>
      announce({
        message: `Cuenta «${account.name}» creada`,
        moneyAccount: account,
        placement: 'bottom',
        tone: 'success',
      }),
    [announce],
  );

  return {
    announce,
    announceCreated,
    announceCreatedMoneyAccount,
    announceDeleted,
    dismissNotice,
    notice,
  };
}

/**
 * Confirmación de un movimiento recién creado (o del par de un cambio). Si es
 * uno solo, tocar la tarjeta abre su detalle.
 */
export function createdMovementNotice(
  created: readonly SessionTransaction[],
  category: Pick<Category, 'colorToken' | 'icon'>,
  openDetail: (transactionId: string) => void,
): Omit<MovementNotice, 'id'> {
  const single = created.length === 1 ? created[0] : undefined;
  const message = single
    ? `${single.type === 'income' ? 'Ingreso' : 'Gasto'} agregado`
    : 'Movimientos agregados';

  return {
    category,
    message,
    onPress: single ? () => openDetail(single.id) : undefined,
    placement: 'bottom',
    pressHint: single ? 'Abre el detalle del movimiento' : undefined,
    tone: 'success',
  };
}
