import {
  createDefaultCategoryInputForSpace,
  defaultCategoryPages,
} from '@/features/categories/constants/defaultCategories';
import { categoryColors } from '@/theme/categoryColors';

const expectedPages = [
  [
    'Salario',
    'Supermercado',
    'Vivienda',
    'Transporte',
    'Servicios',
    'Restaurantes',
    'Compras',
    'Salud',
    'Salidas',
  ],
  [
    'Freelance',
    'Familia',
    'Ocio',
    'Educación',
    'Suscripciones',
    'Viajes',
    'Mascotas',
    'Deudas',
    'Otros',
  ],
] as const;

describe('defaultCategories', () => {
  it('mantiene dos páginas ordenadas de nueve categorías', () => {
    expect(defaultCategoryPages).toHaveLength(2);
    expect(
      defaultCategoryPages.map((page) => page.map(({ name }) => name)),
    ).toEqual(expectedPages);
  });

  it('crea copias independientes para cada espacio', () => {
    const definitions = defaultCategoryPages.flat();
    const personal = definitions.map((definition) =>
      createDefaultCategoryInputForSpace('personal', definition),
    );
    const couple = definitions.map((definition) =>
      createDefaultCategoryInputForSpace('couple', definition),
    );

    expect(personal).toHaveLength(18);
    expect(
      personal.every(
        ({ spaceId, isDefault }) => spaceId === 'personal' && isDefault,
      ),
    ).toBe(true);
    expect(couple.every(({ spaceId }) => spaceId === 'couple')).toBe(true);
    expect(personal).not.toBe(couple);
  });

  it('asigna un color distinto a cada plantilla desde la paleta completa', () => {
    const colorTokens = defaultCategoryPages
      .flat()
      .map(({ colorToken }) => colorToken);

    expect(Object.keys(categoryColors)).toHaveLength(18);
    expect(new Set(Object.values(categoryColors)).size).toBe(18);
    expect(new Set(colorTokens).size).toBe(18);
    expect(new Set(colorTokens)).toEqual(new Set(Object.keys(categoryColors)));
  });

  it('asocia Salario y Familia a los colores sugeridos', () => {
    const definitions = defaultCategoryPages.flat();

    expect(definitions.find(({ key }) => key === 'salary')).toMatchObject({
      colorToken: 'green',
    });
    expect(definitions.find(({ key }) => key === 'family')).toMatchObject({
      colorToken: 'plum',
    });
    expect(categoryColors.green).toBe('#00CD5C');
    expect(categoryColors.plum).toBe('#D642FF');
  });

  it('presenta Salidas con un icono de copas de vino', () => {
    expect(
      defaultCategoryPages.flat().find(({ key }) => key === 'savings'),
    ).toMatchObject({ name: 'Salidas', icon: 'wine' });
  });
});
