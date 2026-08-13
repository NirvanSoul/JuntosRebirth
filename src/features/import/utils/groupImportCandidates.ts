import type { ImportedTransactionCandidate } from '@/features/import/types';

export type ImportCandidateGroup = {
  id: string;
  normalizedMerchant: string;
  title: string;
  candidates: readonly ImportedTransactionCandidate[];
};

function isExactDuplicate(candidate: ImportedTransactionCandidate): boolean {
  return candidate.duplicateStatus === 'exact';
}

function groupPriority(group: ImportCandidateGroup): number {
  // El sort estable conserva el orden de los grupos nuevos (incluidos los
  // ya seleccionados); únicamente desplazamos los grupos totalmente repetidos.
  return group.candidates.every(isExactDuplicate) ? 1 : 0;
}

/**
 * La revisión masiva se organiza por comercio normalizado, nunca por el texto
 * crudo del extracto. Así variantes como "MERCADONA MADRID" y "Mercadona
 * Madrid" reciben una única categoría sin perder las fechas, importes o tipos
 * propios de cada movimiento.
 */
export function groupImportCandidates(
  candidates: readonly ImportedTransactionCandidate[],
): readonly ImportCandidateGroup[] {
  const groups = new Map<string, ImportCandidateGroup>();

  for (const candidate of candidates) {
    const normalizedMerchant = candidate.normalizedMerchant.trim();
    // Una descripción que no se pudo normalizar no debe mezclar movimientos
    // distintos: cada fila queda aislada y sigue pudiendo revisarse.
    const id = normalizedMerchant || candidate.id;
    const existing = groups.get(id);

    if (existing) {
      groups.set(id, {
        ...existing,
        candidates: [...existing.candidates, candidate],
      });
      continue;
    }

    groups.set(id, {
      id,
      normalizedMerchant,
      title: candidate.displayTitle,
      candidates: [candidate],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      // Un comercio puede tener una fila nueva y otra repetida: la nueva se
      // revisa primero sin perder el agrupamiento para la acción masiva.
      candidates: [...group.candidates].sort(
        (left, right) =>
          Number(isExactDuplicate(left)) - Number(isExactDuplicate(right)),
      ),
    }))
    .sort((left, right) => groupPriority(left) - groupPriority(right));
}
