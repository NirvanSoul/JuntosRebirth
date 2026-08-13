import { suggestCategory } from '@/features/import/categorization/suggestCategory';
import type { Category } from '@/features/categories/types';

const categories: Category[] = [
  {
    id: 'supermercado',
    spaceId: 'personal',
    name: 'Supermercado',
    icon: 'shopping-cart',
    colorToken: 'green',
    isDefault: false,
    isArchived: false,
  },
  {
    id: 'ocio',
    spaceId: 'personal',
    name: 'Ocio',
    icon: 'game-controller',
    colorToken: 'violet',
    isDefault: false,
    isArchived: true,
  },
  {
    id: 'ocio-pareja',
    spaceId: 'couple',
    name: 'Ocio',
    icon: 'game-controller',
    colorToken: 'violet',
    isDefault: false,
    isArchived: false,
  },
];

describe('suggestCategory', () => {
  it('sugiere una categoría existente por coincidencia exacta (sin acentos ni mayúsculas)', () => {
    expect(
      suggestCategory('supermercado', categories, 'personal').categoryId,
    ).toBe('supermercado');
  });

  it('no sugiere nada sin coincidencia exacta', () => {
    expect(
      suggestCategory('mercadona', categories, 'personal').categoryId,
    ).toBeNull();
  });

  it('no sugiere una categoría archivada', () => {
    expect(
      suggestCategory('ocio', categories, 'personal').categoryId,
    ).toBeNull();
  });

  it('no sugiere una categoría de otro espacio', () => {
    expect(suggestCategory('ocio', categories, 'personal').categoryId).not.toBe(
      'ocio-pareja',
    );
  });

  it('no sugiere nada para un comercio vacío', () => {
    expect(suggestCategory('', categories, 'personal').categoryId).toBeNull();
  });

  it('prioriza una regla personal del mismo espacio sobre el nombre de categoría', () => {
    expect(
      suggestCategory('mercadona', categories, 'personal', [
        {
          id: 'rule-id',
          spaceId: 'personal',
          normalizedMerchant: 'mercadona',
          categoryId: 'supermercado',
          confirmations: 1,
          source: 'import_correction',
          createdAt: '2026-08-09T10:00:00.000Z',
          updatedAt: '2026-08-09T10:00:00.000Z',
        },
      ]).categoryId,
    ).toBe('supermercado');
  });

  it('ignora una regla personal que apunta a una categoría archivada', () => {
    expect(
      suggestCategory('mercadona', categories, 'personal', [
        {
          id: 'rule-id',
          spaceId: 'personal',
          normalizedMerchant: 'mercadona',
          categoryId: 'ocio',
          confirmations: 1,
          source: 'import_correction',
          createdAt: '2026-08-09T10:00:00.000Z',
          updatedAt: '2026-08-09T10:00:00.000Z',
        },
      ]).categoryId,
    ).toBeNull();
  });
});
