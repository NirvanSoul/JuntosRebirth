import type { Category } from '@/features/categories/types';
import type { ImportMerchantRule } from '@/features/import/types';
import { findEquivalentCategoryBySpace } from '@/features/categories/utils/categoryCatalog';

export type CategorySuggestion = {
  categoryId: string | null;
};

type CategoryMatcher = (
  normalizedMerchant: string,
  categories: readonly Category[],
  spaceId: string,
  merchantRules: readonly ImportMerchantRule[],
) => string | null;

const matchByPersonalRule: CategoryMatcher = (
  normalizedMerchant,
  categories,
  spaceId,
  merchantRules,
) => {
  const rule = merchantRules.find(
    (candidate) =>
      candidate.spaceId === spaceId &&
      candidate.normalizedMerchant === normalizedMerchant,
  );
  if (!rule) return null;

  // Una regla no revive una categoría archivada ni puede cruzar espacios.
  return categories.some(
    (category) =>
      category.id === rule.categoryId &&
      category.spaceId === spaceId &&
      !category.isArchived,
  )
    ? rule.categoryId
    : null;
};

/**
 * Coincidencia exacta contra el nombre de una categoría real del espacio
 * (Bible §37, paso 3), reutilizando el mismo matcher que ya usa la creación
 * de categorías para detectar duplicados por nombre. Único matcher activo
 * en la Fase 1.
 */
const matchByExactCategoryName: CategoryMatcher = (
  normalizedMerchant,
  categories,
  spaceId,
  _merchantRules,
) => {
  const match = findEquivalentCategoryBySpace(
    categories,
    spaceId,
    normalizedMerchant,
  );
  return match?.id ?? null;
};

/**
 * Matchers de más a menos confiable (Bible §37); el primero que responda
 * gana. Punto de extensión pensado para la futura "ventana de
 * contextualización": una regla por palabras clave del comercio (aprendida
 * de correcciones previas, o de un vocabulario compartido) se añadiría aquí
 * como un matcher nuevo, sin tocar `normalizeTransactionRow` ni el resto del
 * pipeline — ese código solo conoce `suggestCategory`, nunca sus matchers
 * internos. No implementado todavía (Bible §39-§44, fuera de alcance de la
 * Fase 1).
 */
const categoryMatchers: readonly CategoryMatcher[] = [
  matchByPersonalRule,
  matchByExactCategoryName,
];

export function suggestCategory(
  normalizedMerchant: string,
  categories: readonly Category[],
  spaceId: string,
  merchantRules: readonly ImportMerchantRule[] = [],
): CategorySuggestion {
  if (!normalizedMerchant.trim()) {
    return { categoryId: null };
  }

  for (const matcher of categoryMatchers) {
    const categoryId = matcher(
      normalizedMerchant,
      categories,
      spaceId,
      merchantRules,
    );
    if (categoryId) return { categoryId };
  }

  return { categoryId: null };
}
