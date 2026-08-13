import {
  columnHeaderAliases,
  valueDateHeaderAliases,
} from '@/features/import/constants/importLimits';
import type { ColumnMapping, ColumnRole } from '@/features/import/types';
import { normalizeComparisonText } from '@/features/import/utils/normalizeComparisonText';

const rolesByPriority: readonly ColumnRole[] = [
  'date',
  'description',
  'amount',
  'debit',
  'credit',
  'transactionType',
  'currency',
  'balance',
];

/**
 * Detecta a qué rol corresponde cada columna a partir de sus encabezados
 * (Bible §12). Cuando existen tanto "fecha operación" como "fecha valor",
 * prioriza la primera y dedica la segunda a `balance`/`ignore` para no
 * asignar dos columnas al mismo rol único. Los roles no exclusivos (ninguno
 * aquí en Fase 1) podrían repetirse; date/description/amount/currency no.
 */
export function detectColumnMapping(headers: readonly string[]): ColumnMapping {
  const normalizedHeaders = headers.map(normalizeComparisonText);
  const mapping = new Map<number, ColumnRole>();
  const assignedRoles = new Set<ColumnRole>();
  const singleUseRoles = new Set<ColumnRole>([
    'date',
    'description',
    'amount',
    'currency',
  ]);

  for (const role of rolesByPriority) {
    const aliases = columnHeaderAliases[role];
    if (!aliases) continue;

    const columnIndex = normalizedHeaders.findIndex((header, index) => {
      if (mapping.has(index)) return false;
      return aliases.includes(header);
    });

    if (columnIndex !== -1) {
      mapping.set(columnIndex, role);
      if (singleUseRoles.has(role)) assignedRoles.add(role);
    }
  }

  if (!assignedRoles.has('date')) {
    const valueDateIndex = normalizedHeaders.findIndex(
      (header, index) =>
        !mapping.has(index) && valueDateHeaderAliases.includes(header),
    );
    if (valueDateIndex !== -1) {
      mapping.set(valueDateIndex, 'date');
    }
  }

  return mapping;
}

export function columnMappingHasMinimumRoles(mapping: ColumnMapping): boolean {
  const roles = new Set(mapping.values());
  // Un archivo de solo gastos (o solo ingresos) puede traer una única
  // columna de "debit" o "credit", sin la contraria: no hace falta exigir
  // las dos a la vez para poder normalizar la fila.
  const hasAmountSignal =
    roles.has('amount') || roles.has('debit') || roles.has('credit');
  return roles.has('date') && hasAmountSignal;
}
