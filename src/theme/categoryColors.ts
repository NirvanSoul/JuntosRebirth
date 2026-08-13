import { lightColors } from '@/theme/colors';

export const categoryColors = {
  emerald: '#00C968',
  orange: '#F15A0A',
  slate: '#4B5C73',
  yellow: '#FFC515',
  violet: '#7A35F2',
  blue: '#098FCC',
  pink: '#DE1D6A',
  red: '#ED123F',
  amber: '#E87900',
  teal: '#009E91',
  indigo: '#4F46D8',
  brown: '#9A5B32',
  green: '#24843C',
  coral: '#C94232',
  plum: '#A134C4',
  rose: '#C92F75',
  cyan: '#0087A8',
  steel: '#60758F',
} as const;

export type CategoryColorToken = keyof typeof categoryColors;

/**
 * Los fondos de categoría son colores fijos, ajenos al tema claro/oscuro, así
 * que su contraste también debe serlo: `yellow` siempre necesita texto e
 * iconografía oscuros, sin importar si la app está en modo oscuro.
 */
export const categoryContentContrast = {
  default: { color: lightColors.onBrand, tone: 'onBrand' },
  yellow: { color: lightColors.textPrimary, tone: 'primary' },
} as const;

export function getCategoryContentContrast(colorToken: CategoryColorToken) {
  return colorToken === 'yellow'
    ? categoryContentContrast.yellow
    : categoryContentContrast.default;
}
