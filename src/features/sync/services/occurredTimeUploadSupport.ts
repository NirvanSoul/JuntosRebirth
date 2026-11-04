import { ApiError } from '@/services/api/client';

/**
 * Un servidor anterior a la hora del movimiento rechaza el lote entero con
 * `400 INVALID_SYNC_PAYLOAD` en cuanto ve la clave `occurredTime`. Se detecta
 * en esa respuesta, se reintenta el lote sin la clave y no se vuelve a enviar
 * durante la vida del proceso. Al reabrir la app se prueba otra vez, así que
 * en cuanto el servidor la acepta la hora empieza a viajar sin cambiar nada.
 *
 * Sin la clave el servidor conserva la hora que tuviera (ausente ≠ `null`), y
 * la app conserva la suya en SQLite.
 */
let serverAcceptsOccurredTime = true;

export function isOccurredTimeRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    error.code === 'INVALID_SYNC_PAYLOAD' &&
    error.details?.reason === 'FIELD_NOT_ALLOWED' &&
    error.details.path?.includes('occurredTime') === true
  );
}

function withoutOccurredTime(
  transaction: Record<string, unknown>,
): Record<string, unknown> {
  const { occurredTime: _occurredTime, ...rest } = transaction;
  return rest;
}

/**
 * Envía el lote con la hora si el servidor la admite; si la rechaza por ser
 * un campo desconocido, lo reenvía una vez sin ella.
 */
export async function sendWithOccurredTimeSupport<Result>(
  transactions: readonly Record<string, unknown>[],
  send: (transactions: Record<string, unknown>[]) => Promise<Result>,
): Promise<Result> {
  if (!serverAcceptsOccurredTime) {
    return send(transactions.map(withoutOccurredTime));
  }
  try {
    return await send([...transactions]);
  } catch (error) {
    if (!isOccurredTimeRejection(error)) throw error;
    serverAcceptsOccurredTime = false;
    return send(transactions.map(withoutOccurredTime));
  }
}

/** Solo para pruebas: vuelve a suponer que el servidor admite la hora. */
export function resetOccurredTimeSupportForTests(): void {
  serverAcceptsOccurredTime = true;
}
