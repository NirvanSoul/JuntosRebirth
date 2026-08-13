import type {
  ColumnRole,
  ImportSourceExtension,
} from '@/features/import/types';

export const importAcceptedExtensions: readonly ImportSourceExtension[] = [
  'xlsx',
  'xls',
  'csv',
];

export const importAcceptedMimeTypes: readonly string[] = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
];

export const importFileSizeLimitBytes: Record<ImportSourceExtension, number> = {
  xlsx: 15 * 1024 * 1024,
  xls: 15 * 1024 * 1024,
  csv: 10 * 1024 * 1024,
};

export const importMaxRows = 10_000;

/**
 * Alias de encabezado por rol de columna (Bible §12), en minúsculas y sin
 * acentos para comparar con `normalizeHeaderText`. El orden dentro de cada
 * lista no importa; la preferencia entre "date" y "value date" se resuelve
 * aparte en `detectColumnMapping`.
 */
export const columnHeaderAliases: Partial<
  Record<ColumnRole, readonly string[]>
> = {
  date: [
    'fecha',
    'date',
    'fecha operacion',
    'operation date',
    'transaction date',
    'booking date',
    'fecha movimiento',
  ],
  balance: ['saldo', 'balance', 'running balance'],
  description: [
    'concepto',
    'descripcion',
    'description',
    'detalle',
    'details',
    'merchant',
    'payee',
    'beneficiary',
    'beneficiario',
    'movimiento',
    'transaction',
  ],
  amount: ['importe', 'amount', 'cantidad', 'monto', 'value'],
  debit: ['debit', 'debito', 'cargo', 'withdrawal', 'outflow'],
  credit: ['credit', 'credito', 'abono', 'deposit', 'inflow'],
  transactionType: ['tipo', 'type', 'naturaleza', 'tipo de movimiento'],
  currency: ['currency', 'moneda', 'divisa', 'ccy'],
};

/** Alias de "fecha valor", con menor prioridad que la fecha de operación. */
export const valueDateHeaderAliases: readonly string[] = [
  'fecha valor',
  'value date',
];

/**
 * Palabras que, como *valor* de una columna `transactionType` (Bible §17:
 * "Cargo / Abono" como columna de texto propia, distinta de columnas de
 * importe separadas para débito/crédito), indican gasto o ingreso. Todo en
 * minúsculas y sin acentos para comparar con `normalizeComparisonText`.
 */
export const expenseIndicatorWords: readonly string[] = [
  'cargo',
  'debito',
  'debit',
  'dr',
  'gasto',
  'expense',
  'withdrawal',
  'outflow',
];

export const incomeIndicatorWords: readonly string[] = [
  'abono',
  'credito',
  'credit',
  'cr',
  'ingreso',
  'income',
  'deposit',
  'inflow',
];
