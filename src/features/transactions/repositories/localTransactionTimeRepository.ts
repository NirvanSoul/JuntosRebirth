import type { SessionTransaction } from '@/features/transactions/types';
import { isValidTimeOfDay } from '@/lib/date/timeOfDay';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

/**
 * Pone o quita la hora de un movimiento ya creado, sin tocar el resto de sus
 * campos: es el equivalente a `updateLocalTransactionNote` para la fila «Hora»
 * del detalle. Devuelve el instante guardado para que la sesión use el mismo
 * `updatedAt` que gana en el LWW de la sincronización.
 */
export async function updateLocalTransactionOccurredTime(
  transactionId: string,
  spaceId: string,
  occurredTime: string | null,
): Promise<string> {
  if (occurredTime !== null && !isValidTimeOfDay(occurredTime)) {
    throw new Error('La hora del movimiento no es válida');
  }
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE transactions
        SET occurred_time = ?, updated_at = ?,
            sync_status = CASE
              WHEN sync_status = 'local_only' THEN 'local_only'
              ELSE 'pending'
            END
      WHERE id = ? AND space_id = ? AND is_archived = 0`,
    occurredTime,
    now,
    transactionId,
    spaceId,
  );
  if (result.changes !== 1) {
    throw new Error('El movimiento local ya no está disponible');
  }
  return now;
}

/**
 * Una edición del formulario no escribe la hora: tiene su propia fila en el
 * detalle. Los movimientos que devuelve `updateLocalTransaction` reemplazan a
 * los de la sesión, así que llevan la hora que conserva SQLite y no la del
 * borrador.
 */
export async function withStoredOccurredTimes(
  transactions: SessionTransaction[],
): Promise<SessionTransaction[]> {
  if (transactions.length === 0) return transactions;

  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    occurred_time: string | null;
  }>(
    `SELECT id, occurred_time FROM transactions
      WHERE id IN (${transactions.map(() => '?').join(', ')})`,
    ...transactions.map((transaction) => transaction.id),
  );
  const timeById = new Map(rows.map((row) => [row.id, row.occurred_time]));

  return transactions.map((transaction) => {
    const { occurredTime: _draftTime, ...rest } = transaction;
    const occurredTime = timeById.get(transaction.id);
    return isValidTimeOfDay(occurredTime) ? { ...rest, occurredTime } : rest;
  });
}
