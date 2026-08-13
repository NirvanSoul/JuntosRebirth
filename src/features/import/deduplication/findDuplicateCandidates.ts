import type {
  ImportDuplicateStatus,
  ImportedTransactionCandidate,
} from '@/features/import/types';
import { normalizeComparisonText } from '@/features/import/utils/normalizeComparisonText';

type DuplicateKeyInput = {
  spaceId: string;
  occurredOn: string;
  amountMinor: number;
  currency: string;
  normalizedMerchant: string;
};

function buildExactKey(input: DuplicateKeyInput): string {
  return [
    input.spaceId,
    input.occurredOn,
    input.amountMinor,
    input.currency,
    normalizeComparisonText(input.normalizedMerchant),
  ].join('|');
}

function buildProbableKey(
  input: Omit<DuplicateKeyInput, 'normalizedMerchant'>,
): string {
  return [
    input.spaceId,
    input.occurredOn,
    input.amountMinor,
    input.currency,
  ].join('|');
}

export type DuplicateLookup = {
  exactKeys: Set<string>;
  probableKeys: Set<string>;
};

export function createDuplicateLookup(): DuplicateLookup {
  return { exactKeys: new Set(), probableKeys: new Set() };
}

/**
 * Registra un movimiento (importado previamente o ya existente) en el
 * índice usado para detectar duplicados. `existingTransactions` ya es el
 * dataset local completo (Bible §48-§49), por lo que no hace falta
 * persistir un fingerprint aparte: comparar en memoria es suficiente y más
 * simple.
 */
export function registerKnownTransaction(
  lookup: DuplicateLookup,
  input: DuplicateKeyInput,
): void {
  lookup.exactKeys.add(buildExactKey(input));
  lookup.probableKeys.add(buildProbableKey(input));
}

/**
 * Determina si un candidato coincide exactamente (mismo espacio, fecha,
 * importe, moneda y descripción normalizada) o solo "probablemente" (mismo
 * espacio, fecha, importe y moneda, descripción distinta) con algo ya
 * conocido. Un duplicado "probable" nunca se descarta automáticamente
 * (Bible §50): solo se marca para revisión.
 */
export function detectDuplicateStatus(
  candidate: DuplicateKeyInput,
  lookup: DuplicateLookup,
): ImportDuplicateStatus {
  if (lookup.exactKeys.has(buildExactKey(candidate))) return 'exact';
  if (lookup.probableKeys.has(buildProbableKey(candidate))) return 'probable';
  return 'none';
}

/**
 * Marca `duplicateStatus`/`selected`/`issues` de todo el lote, comparando
 * primero contra `lookup` (los movimientos ya guardados) y después entre
 * las propias filas del archivo, para detectar también un extracto con
 * filas repetidas internamente. Los duplicados exactos aparecen
 * deseleccionados por defecto (Bible §51); los probables quedan
 * seleccionados pero con aviso.
 */
export function markDuplicateCandidates(
  candidates: readonly ImportedTransactionCandidate[],
  spaceId: string,
  lookup: DuplicateLookup,
): ImportedTransactionCandidate[] {
  const batchLookup = createDuplicateLookup();

  return candidates.map((candidate) => {
    if (
      candidate.occurredOn === null ||
      candidate.amountMinor === null ||
      candidate.currency === null
    ) {
      return candidate;
    }

    const key: DuplicateKeyInput = {
      spaceId,
      occurredOn: candidate.occurredOn,
      amountMinor: candidate.amountMinor,
      currency: candidate.currency,
      normalizedMerchant: candidate.normalizedMerchant,
    };

    const statusAgainstExisting = detectDuplicateStatus(key, lookup);
    const statusWithinBatch = detectDuplicateStatus(key, batchLookup);
    registerKnownTransaction(batchLookup, key);

    const duplicateStatus: ImportDuplicateStatus =
      statusAgainstExisting === 'exact' || statusWithinBatch === 'exact'
        ? 'exact'
        : statusAgainstExisting === 'probable' ||
            statusWithinBatch === 'probable'
          ? 'probable'
          : 'none';

    if (duplicateStatus === 'none') return candidate;

    return {
      ...candidate,
      duplicateStatus,
      selected: duplicateStatus === 'exact' ? false : candidate.selected,
      issues:
        duplicateStatus === 'exact'
          ? [
              ...candidate.issues,
              {
                code: 'probable_duplicate' as const,
                message: 'Ya existe un movimiento igual a este.',
              },
            ]
          : [
              ...candidate.issues,
              {
                code: 'probable_duplicate' as const,
                message: 'Podría ser un duplicado. Revísalo.',
              },
            ],
    };
  });
}
