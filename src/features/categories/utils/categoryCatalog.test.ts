import type { Category } from '@/features/categories/types';
import {
  findEquivalentCategoryBySpace,
  listCategoriesBySpace,
  validateCategoryName,
} from '@/features/categories/utils/categoryCatalog';

const categories: Category[] = [
  {
    id: 'personal-food',
    spaceId: 'personal',
    name: 'Comida',
    icon: 'fork-knife',
    colorToken: 'orange',
    isDefault: false,
    isArchived: false,
  },
  {
    id: 'couple-home',
    spaceId: 'couple',
    name: 'Casa',
    icon: 'house',
    colorToken: 'slate',
    isDefault: false,
    isArchived: false,
  },
];

describe('categoryCatalog', () => {
  it('devuelve únicamente las categorías activas del espacio solicitado', () => {
    expect(listCategoriesBySpace(categories, 'personal')).toEqual([
      categories[0],
    ]);
  });

  it('rechaza duplicados equivalentes dentro del mismo espacio', () => {
    expect(validateCategoryName('  cómida ', categories, 'personal')).toEqual({
      valid: false,
      error: 'Ya existe una categoría con ese nombre en este espacio.',
    });
  });

  it('permite el mismo nombre en espacios diferentes', () => {
    expect(validateCategoryName('Comida', categories, 'couple')).toEqual({
      valid: true,
      name: 'Comida',
    });
  });

  it('localiza una categoría equivalente dentro del espacio de destino', () => {
    expect(
      findEquivalentCategoryBySpace(categories, 'personal', '  cómida '),
    ).toEqual(categories[0]);
    expect(
      findEquivalentCategoryBySpace(categories, 'couple', 'Comida'),
    ).toBeUndefined();
  });
});
