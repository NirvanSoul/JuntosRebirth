import { lightColors } from '@/theme/colors';

export const categoryColors = {
  violet: '#842FFB',
  plum: '#D642FF',
  rose: '#FF93FD',
  pink: '#FF0084',
  slate: '#AFBEC3',
  steel: '#617D8B',
  green: '#00CD5C',
  teal: '#14BAA9',
  emerald: '#27E9B5',
  cyan: '#44E9FF',
  blue: '#2E95F0',
  indigo: '#295BAB',
  yellow: '#FFC200',
  orange: '#FF8725',
  coral: '#FF4000',
  red: '#FF0004',
  brown: '#BC6128',
  amber: '#6C300B',
} as const;

export type CategoryColorToken = keyof typeof categoryColors;

/** Orden visual compartido por los selectores de categoría y cuenta. */
export const categoryColorTokens = [
  'violet',
  'plum',
  'rose',
  'pink',
  'slate',
  'steel',
  'green',
  'teal',
  'emerald',
  'cyan',
  'blue',
  'indigo',
  'yellow',
  'orange',
  'coral',
  'red',
  'brown',
  'amber',
] as const satisfies readonly CategoryColorToken[];

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
