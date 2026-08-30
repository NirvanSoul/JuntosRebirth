import {
  amountMinorToInput,
  parseAmountMinor,
} from '@/lib/currency/amountInput';

/**
 * Saldo inicial con signo escrito por el usuario.
 *
 * `parseAmountMinor` no contempla el signo: para `-450,50` interpreta la parte
 * entera como `-450` y le suma los 50 céntimos, devolviendo `-44950` en vez de
 * `-45050`. Aquí el signo se separa antes de medir la magnitud y se aplica al
 * final, que es la única forma de que un saldo negativo con decimales sea
 * correcto.
 */
export function parseSignedAmountMinor(value: string): number {
  const isNegative = value.trimStart().startsWith('-');
  const magnitude = parseAmountMinor(value.replace('-', ''));

  // `-0` no es 0 para `Object.is`, y un saldo cero con signo no significa
  // nada: se normaliza antes de salir.
  return isNegative && magnitude !== 0 ? -magnitude : magnitude;
}

export function signedAmountMinorToInput(amountMinor: number): string {
  const magnitude = amountMinorToInput(Math.abs(amountMinor));

  return amountMinor < 0 ? `-${magnitude}` : magnitude;
}

/**
 * Deja escribir dígitos, un separador decimal y un signo negativo inicial.
 * Cualquier otro carácter se descarta mientras se teclea.
 */
export function sanitizeSignedAmountInput(value: string): string {
  const isNegative = value.trimStart().startsWith('-');
  const digits = value.replace(/[^0-9,]/g, '');

  // El campo opcional debe poder quedarse vacío. Forzarlo a `0` impedía
  // borrar el último dígito y hacía que la interfaz pareciera editable solo
  // hasta llegar a ese valor.
  if (!digits) return isNegative ? '-' : '';

  return isNegative ? `-${digits}` : digits;
}
