import { lightColors } from '@/theme/colors';

export const categoryColors = {
  violet: '#842FFB',
  plum: '#D642FF',
  pink: '#FF0084',
  slate: '#AFBEC3',
  steel: '#617D8B',
  forest: '#15A250',
  green: '#00CD5C',
  teal: '#14BAA9',
  blue: '#2E95F0',
  indigo: '#295BAB',
  yellow: '#FFC200',
  orange: '#FF8725',
  coral: '#FF4000',
  red: '#FF0004',
  brown: '#BC6128',
} as const;

export type CategoryColorToken = keyof typeof categoryColors;

/**
 * Orden visual compartido por los selectores de categoría y cuenta: tres filas
 * de cinco que agrupan morados y neutros, verdes y azules, y cálidos.
 */
export const categoryColorTokens = [
  'violet',
  'plum',
  'pink',
  'slate',
  'steel',
  'forest',
  'green',
  'teal',
  'blue',
  'indigo',
  'yellow',
  'orange',
  'coral',
  'red',
  'brown',
] as const satisfies readonly CategoryColorToken[];

/**
 * Colores retirados de la paleta. Los datos locales se migran, pero una cuenta
 * restaurada desde el servicio remoto puede seguir trayendo el valor antiguo.
 */
export const retiredCategoryColorReplacements: Readonly<
  Record<string, CategoryColorToken>
> = {
  rose: 'plum',
  emerald: 'forest',
  cyan: 'teal',
  amber: 'brown',
};

/** Devuelve el token vigente equivalente, o `null` si no se reconoce. */
export function normalizeCategoryColorToken(
  colorToken: string,
): CategoryColorToken | null {
  if (colorToken in categoryColors) return colorToken as CategoryColorToken;
  return retiredCategoryColorReplacements[colorToken] ?? null;
}

/**
 * Los fondos de categoría son colores fijos, ajenos al tema claro/oscuro, así
 * que su contenido también debe serlo: texto e iconografía siempre blancos.
 */
export const categoryContentContrast = {
  default: { color: lightColors.onBrand, tone: 'onBrand' },
} as const;

export function getCategoryContentContrast(_colorToken: CategoryColorToken) {
  return categoryContentContrast.default;
}
