import { randomUUID } from 'expo-crypto';

import type { Category } from '@/features/categories/types';
import { suggestCategory } from '@/features/import/categorization/suggestCategory';
import { inferTransactionTypeFromText } from '@/features/import/normalization/inferTransactionType';
import type { DayMonthPreference } from '@/features/import/normalization/normalizeDate';
import { normalizeAmount } from '@/features/import/normalization/normalizeAmount';
import { normalizeDate } from '@/features/import/normalization/normalizeDate';
import { normalizeDescription } from '@/features/import/normalization/normalizeDescription';
import type {
  ColumnMapping,
  ImportIssue,
  ImportMerchantRule,
  ImportedTransactionCandidate,
} from '@/features/import/types';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

export type NormalizeTransactionRowOptions = {
  spaceId: string;
  categories: readonly Category[];
  merchantRules?: readonly ImportMerchantRule[];
  fallbackCurrency: CurrencyCode;
  dayMonthPreference: DayMonthPreference;
};

function findCell(
  row: readonly unknown[],
  mapping: ColumnMapping,
  role:
    | 'date'
    | 'description'
    | 'amount'
    | 'debit'
    | 'credit'
    | 'transactionType'
    | 'currency',
): unknown {
  for (const [columnIndex, mappedRole] of mapping) {
    if (mappedRole === role) return row[columnIndex];
  }
  return undefined;
}

function toRawText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || toRawText(value) === '';
}

/**
 * Normaliza una fila cruda del archivo a un candidato de importación. Nunca
 * decide en silencio: cualquier ambigüedad de fecha, importe o tipo se
 * traduce en un `issue` que obliga a revisar la fila (Bible §2, §15-§17).
 * Devuelve `null` cuando la fila no tiene ninguna señal de importe (Bible
 * §35: encabezados repetidos, pies de página, "página X de Y", etc. no son
 * movimientos).
 */
export function normalizeTransactionRow(
  row: readonly unknown[],
  sourceRowNumber: number,
  mapping: ColumnMapping,
  options: NormalizeTransactionRowOptions,
): ImportedTransactionCandidate | null {
  const dateCellRaw = findCell(row, mapping, 'date');
  const descriptionCellRaw = findCell(row, mapping, 'description');
  const amountCellRaw = findCell(row, mapping, 'amount');
  const debitCellRaw = findCell(row, mapping, 'debit');
  const creditCellRaw = findCell(row, mapping, 'credit');
  const transactionTypeCellRaw = findCell(row, mapping, 'transactionType');
  const currencyCellRaw = findCell(row, mapping, 'currency');

  const hasAmountSignal =
    !isBlank(amountCellRaw) ||
    !isBlank(debitCellRaw) ||
    !isBlank(creditCellRaw);
  if (!hasAmountSignal) {
    return null;
  }

  const issues: ImportIssue[] = [];

  const dateValue =
    typeof dateCellRaw === 'number' ? dateCellRaw : toRawText(dateCellRaw);
  const dateResult = normalizeDate(
    dateValue === '' ? null : dateValue,
    options.dayMonthPreference,
  );
  if (dateResult.occurredOn === null) {
    issues.push({
      code: 'unparseable_date',
      message: 'No pudimos reconocer la fecha de este movimiento.',
    });
  } else if (dateResult.ambiguous) {
    issues.push({
      code: 'ambiguous_date',
      message: 'La fecha es ambigua. Confirma que sea correcta.',
    });
  }

  let currency: CurrencyCode = options.fallbackCurrency;
  if (!isBlank(currencyCellRaw)) {
    const rawCurrency = toRawText(currencyCellRaw).toUpperCase();
    if (isCurrencyCode(rawCurrency)) {
      currency = rawCurrency;
    } else {
      issues.push({
        code: 'unknown_currency',
        message: 'No reconocimos la moneda de este movimiento.',
      });
      currency = options.fallbackCurrency;
    }
  }

  let amountMinor: number | null = null;
  let isNegative = false;
  let type: ImportedTransactionCandidate['type'] = 'unknown';

  if (!isBlank(amountCellRaw)) {
    const parsed = normalizeAmount(
      typeof amountCellRaw === 'number'
        ? amountCellRaw
        : toRawText(amountCellRaw),
      currency,
    );

    if (parsed.ok) {
      amountMinor = parsed.amountMinor;
      isNegative = parsed.isNegative;
      // Un indicador explícito de tipo (columna "Cargo"/"Abono") es más
      // confiable que el signo del importe (Bible §17): se prioriza sobre
      // `isNegative` cuando ambos existen.
      const inferredType = inferTransactionTypeFromText(transactionTypeCellRaw);
      type = inferredType ?? (isNegative ? 'expense' : 'income');

      if (amountMinor === 0) {
        issues.push({
          code: 'unparseable_amount',
          message: 'No pudimos reconocer el importe de este movimiento.',
        });
      }
    } else if (parsed.reason === 'invalid_fraction') {
      issues.push({
        code: 'invalid_fraction_for_currency',
        message: 'El importe tiene decimales, pero esta moneda no los admite.',
      });
    } else if (parsed.reason === 'unparseable') {
      issues.push({
        code: 'unparseable_amount',
        message: 'No pudimos reconocer el importe de este movimiento.',
      });
    }
  } else {
    const debitParsed = isBlank(debitCellRaw)
      ? null
      : normalizeAmount(
          typeof debitCellRaw === 'number'
            ? debitCellRaw
            : toRawText(debitCellRaw),
          currency,
        );
    const creditParsed = isBlank(creditCellRaw)
      ? null
      : normalizeAmount(
          typeof creditCellRaw === 'number'
            ? creditCellRaw
            : toRawText(creditCellRaw),
          currency,
        );

    let debitInvalid = false;
    let creditInvalid = false;
    let debitUnparseable = false;
    let creditUnparseable = false;

    if (debitParsed && !debitParsed.ok) {
      if (debitParsed.reason === 'invalid_fraction') debitInvalid = true;
      if (debitParsed.reason === 'unparseable') debitUnparseable = true;
    }

    if (creditParsed && !creditParsed.ok) {
      if (creditParsed.reason === 'invalid_fraction') creditInvalid = true;
      if (creditParsed.reason === 'unparseable') creditUnparseable = true;
    }

    if (debitInvalid && creditInvalid) {
      issues.push({
        code: 'invalid_fraction_for_currency',
        message: 'El importe tiene decimales, pero esta moneda no los admite.',
      });
    } else if (debitInvalid) {
      issues.push({
        code: 'invalid_fraction_for_currency',
        message: 'El gasto tiene decimales, pero esta moneda no los admite.',
      });
    } else if (creditInvalid) {
      issues.push({
        code: 'invalid_fraction_for_currency',
        message: 'El ingreso tiene decimales, pero esta moneda no los admite.',
      });
    }

    if (debitUnparseable && creditUnparseable) {
      issues.push({
        code: 'unparseable_amount',
        message: 'No pudimos reconocer el importe de este movimiento.',
      });
    } else if (debitUnparseable) {
      issues.push({
        code: 'unparseable_amount',
        message: 'No pudimos reconocer el gasto de este movimiento.',
      });
    } else if (creditUnparseable) {
      issues.push({
        code: 'unparseable_amount',
        message: 'No pudimos reconocer el ingreso de este movimiento.',
      });
    }

    const hasValidDebit = debitParsed?.ok && debitParsed.amountMinor > 0;
    const hasValidCredit = creditParsed?.ok && creditParsed.amountMinor > 0;
    const hasAnyError =
      debitInvalid || creditInvalid || debitUnparseable || creditUnparseable;

    if (hasAnyError) {
      amountMinor = null;
      type = 'unknown';
    } else if (hasValidDebit && hasValidCredit) {
      amountMinor = null;
      type = 'unknown';
      issues.push({
        code: 'unknown_type',
        message:
          'Este movimiento tiene un gasto y un ingreso a la vez; revísalo.',
      });
    } else if (hasValidDebit) {
      amountMinor = debitParsed.amountMinor;
      type = 'expense';
    } else if (hasValidCredit) {
      amountMinor = creditParsed.amountMinor;
      type = 'income';
    } else {
      amountMinor = null;
      type = 'unknown';
      issues.push({
        code: 'unparseable_amount',
        message: 'No pudimos reconocer el importe de este movimiento.',
      });
    }
  }

  const { displayTitle, normalizedMerchant } = normalizeDescription(
    toRawText(descriptionCellRaw),
  );

  const { categoryId } = suggestCategory(
    normalizedMerchant,
    options.categories,
    options.spaceId,
    options.merchantRules,
  );
  return {
    id: randomUUID(),
    sourceRowNumber,
    rawDescription: toRawText(descriptionCellRaw),
    normalizedMerchant,
    displayTitle,
    occurredOn: dateResult.occurredOn,
    amountMinor: amountMinor && amountMinor > 0 ? amountMinor : null,
    currency,
    type,
    suggestedCategoryId: categoryId,
    categoryId,
    duplicateStatus: 'none',
    issues,
    selected: true,
  };
}
