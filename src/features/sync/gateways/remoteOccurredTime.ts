import { isValidTimeOfDay } from '@/lib/date/timeOfDay';

/**
 * Hora local `HH:mm` de un movimiento remoto. Ausente ≠ `null`: una API
 * anterior no conoce la hora y no debe borrar la que ya tiene el dispositivo,
 * así que una clave ausente devuelve `undefined` y la fila local conserva la
 * suya. Un valor malformado se trata igual: la hora es informativa y no
 * justifica perder la guardada.
 */
export function readRemoteOccurredTime(
  transaction: Record<string, unknown>,
): string | null | undefined {
  if (!('occurredTime' in transaction)) return undefined;
  const value = transaction.occurredTime;
  if (value === null) return null;
  if (isValidTimeOfDay(value)) return value;
  console.error('[sync] Hora de movimiento no reconocida:', value);
  return undefined;
}
