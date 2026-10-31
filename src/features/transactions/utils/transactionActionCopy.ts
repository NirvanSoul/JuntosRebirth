import type { CopyTarget } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import type { SessionTransaction } from '@/features/transactions/types';
import { parseProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';

/**
 * Textos de las acciones sobre un movimiento. Los comparten el detalle y las
 * acciones de la pulsación larga para que digan lo mismo.
 */
export function getTransactionDeletionCopy(transaction: SessionTransaction): {
  title: string;
  description: string;
} {
  if (parseProjectedTransactionId(transaction.id) !== null) {
    return {
      title: '¿Eliminar esta repetición?',
      description:
        'Se omitirá solo esta repetición. Las demás fechas de la serie seguirán iguales.',
    };
  }

  return {
    title: '¿Eliminar este movimiento?',
    description: transaction.sourceTransactionId
      ? 'Es una copia de otro espacio. Se eliminará solo en este espacio; el movimiento original no se verá afectado.'
      : 'Dejará de aparecer en este espacio y sus totales se actualizarán.',
  };
}

export const transactionCopyToSpaceCopy = {
  failureMessage: (target: CopyTarget) =>
    `No se pudo copiar el movimiento en ${target.name}.`,
};

/** Eliminar varios movimientos a la vez desde la selección múltiple. */
export function getTransactionsDeletionCopy(count: number): {
  title: string;
  description: string;
} {
  return {
    title: `¿Eliminar ${count} movimientos?`,
    description:
      'Dejarán de aparecer en este espacio y sus totales se actualizarán. Las repeticiones elegidas se omitirán solo en su fecha.',
  };
}

export const transactionsCopyToSpaceCopy = {
  failureMessage: (target: CopyTarget) =>
    `No se pudieron copiar todos los movimientos en ${target.name}.`,
};
