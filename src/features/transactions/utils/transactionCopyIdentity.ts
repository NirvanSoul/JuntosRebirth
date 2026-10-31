import type { CopyTarget } from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import type { SessionTransaction } from '@/features/transactions/types';

const automaticRecurrences = new Set(['weekly', 'biweekly', 'monthly']);
const noSpaces: ReadonlySet<string> = new Set();

/**
 * Qué viaja al copiar un movimiento a otro espacio. Una repetición automática
 * (semanal, quincenal o mensual) crea en el destino la serie entera desde su
 * fecha, así que todas las repeticiones de una serie son la misma copia: si
 * se copiaran dos, el destino tendría la serie duplicada.
 */
export function getTransactionCopyKey(transaction: SessionTransaction): string {
  return transaction.recurrenceSeriesId &&
    automaticRecurrences.has(transaction.recurrence)
    ? `series:${transaction.recurrenceSeriesId}`
    : transaction.id;
}

export type CopiedSpaceIds = (
  transaction: SessionTransaction,
) => ReadonlySet<string>;

/**
 * Espacios donde cada movimiento ya existe por una copia anterior, en los dos
 * sentidos: el original ya copiado a un espacio y la copia, que ya existe en
 * el espacio de su original. Recibe los movimientos de todos los espacios.
 */
export function indexCopiedTransactionSpaces(
  transactions: readonly SessionTransaction[],
): CopiedSpaceIds {
  const byId = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );
  const spacesByKey = new Map<string, Set<string>>();
  const mark = (key: string, spaceId: string) => {
    const spaces = spacesByKey.get(key) ?? new Set<string>();
    spaces.add(spaceId);
    spacesByKey.set(key, spaces);
  };

  for (const copy of transactions) {
    const source = copy.sourceTransactionId
      ? byId.get(copy.sourceTransactionId)
      : undefined;
    if (!source) continue;
    mark(getTransactionCopyKey(source), copy.spaceId);
    mark(getTransactionCopyKey(copy), source.spaceId);
  }

  return (transaction) =>
    spacesByKey.get(getTransactionCopyKey(transaction)) ?? noSpaces;
}

/** Espacios de destino donde todavía no existe ninguno de los movimientos. */
export function getTransactionCopyTargets<Target extends CopyTarget>(
  transactions: readonly SessionTransaction[],
  targets: readonly Target[],
  copiedSpaceIds: CopiedSpaceIds,
): Target[] {
  return targets.filter((target) =>
    transactions.every(
      (transaction) => !copiedSpaceIds(transaction).has(target.id),
    ),
  );
}
