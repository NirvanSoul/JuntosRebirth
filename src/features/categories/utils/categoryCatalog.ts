import type { Category } from '@/features/categories/types';

const maximumCategoryNameLength = 40;

export type CategoryNameValidation =
  { valid: true; name: string } | { valid: false; error: string };

export function listCategoriesBySpace(
  categories: readonly Category[],
  spaceId: string,
): Category[] {
  return categories.filter(
    (category) => category.spaceId === spaceId && !category.isArchived,
  );
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function categoryComparisonKey(name: string): string {
  return normalizeCategoryName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES');
}

export function findEquivalentCategoryBySpace(
  categories: readonly Category[],
  spaceId: string,
  name: string,
): Category | undefined {
  const comparisonKey = categoryComparisonKey(name);

  return listCategoriesBySpace(categories, spaceId).find(
    (category) => categoryComparisonKey(category.name) === comparisonKey,
  );
}

export function validateCategoryName(
  name: string,
  categories: readonly Category[],
  spaceId: string,
  excludedCategoryId?: string,
): CategoryNameValidation {
  const normalizedName = normalizeCategoryName(name);

  if (!normalizedName) {
    return { valid: false, error: 'Escribe un nombre para la categoría.' };
  }

  if (normalizedName.length > maximumCategoryNameLength) {
    return {
      valid: false,
      error: `El nombre no puede superar ${maximumCategoryNameLength} caracteres.`,
    };
  }

  const comparisonKey = categoryComparisonKey(normalizedName);
  const duplicateExists = listCategoriesBySpace(categories, spaceId).some(
    (category) =>
      category.id !== excludedCategoryId &&
      categoryComparisonKey(category.name) === comparisonKey,
  );

  if (duplicateExists) {
    return {
      valid: false,
      error: 'Ya existe una categoría con ese nombre en este espacio.',
    };
  }

  return { valid: true, name: normalizedName };
}
