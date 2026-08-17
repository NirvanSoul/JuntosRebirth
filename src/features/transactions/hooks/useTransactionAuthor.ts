import { useSpaceMembership } from '@/features/profile/state/SpaceMembershipContext';
import {
  resolveTransactionAuthor,
  type TransactionAuthor,
} from '@/features/transactions/utils/transactionAuthor';

/**
 * Autor de un movimiento, o `undefined` cuando no procede mostrarlo.
 *
 * Devuelve `undefined` en un espacio personal: allí todos los movimientos son
 * de la misma persona y tanto el círculo de la tarjeta como la fila «Autor»
 * serían ruido. Quien consume el hook decide con eso si pinta o no, sin
 * necesidad de conocer el tipo de espacio.
 */
export function useTransactionAuthor(
  createdBy: string,
): TransactionAuthor | undefined {
  const membership = useSpaceMembership();
  if (!membership.isSharedSpace) return undefined;

  return resolveTransactionAuthor(createdBy, membership);
}
