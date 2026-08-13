import {
  expenseIndicatorWords,
  incomeIndicatorWords,
} from '@/features/import/constants/importLimits';
import { normalizeComparisonText } from '@/features/import/utils/normalizeComparisonText';
import type { TransactionType } from '@/features/transactions/types';

/**
 * Interpreta el valor de una columna `transactionType` ("Cargo"/"Abono",
 * "Debit"/"Credit", etc., Bible §17) como gasto o ingreso. Es un indicador
 * explícito y más confiable que el signo del importe, así que quien lo llama
 * debe darle prioridad sobre `isNegative` cuando ambos existan.
 *
 * Este es también el punto de extensión natural para una futura "ventana de
 * contextualización": hoy solo reconoce un vocabulario cerrado de palabras
 * de tipo; el mismo patrón (normalizar texto -> buscar en un vocabulario)
 * es el que usaría una regla basada en palabras clave del comercio para
 * sugerir categoría, sin tener que rediseñar este módulo.
 */
export function inferTransactionTypeFromText(
  rawValue: unknown,
): TransactionType | null {
  if (rawValue === null || rawValue === undefined) return null;

  const text = normalizeComparisonText(String(rawValue));
  if (!text) return null;

  if (expenseIndicatorWords.includes(text)) return 'expense';
  if (incomeIndicatorWords.includes(text)) return 'income';
  return null;
}
