import type { StyleProp, TextProps, TextStyle } from 'react-native';

import { fontFamily } from '@/theme/fonts';
import type { LayoutDensity } from '@/theme/layout';

/**
 * Escala tipográfica de `juntoss`.
 *
 * Los pasos (11, 12, 13, 15, 17, 20, 28, 34, 40, 52) reproducen los estilos de
 * texto de iOS en su tamaño por defecto (Large) y se corresponden con los roles
 * de Material 3, de modo que un mismo token se percibe nativo en ambas
 * plataformas:
 *
 * | Variante   | iOS          | Material 3    |
 * |------------|--------------|---------------|
 * | overline   | Caption 2    | Label small   |
 * | caption    | Caption 1    | Body small    |
 * | footnote   | Footnote     | Body medium   |
 * | label      | Subheadline  | Title small   |
 * | body       | Body         | Body large    |
 * | subheading | Title 3      | Title large   |
 * | heading    | Title 1      | Headline med. |
 * | title      | Large Title  | Headline large|
 * | amount     | —            | Display small |
 *
 * Reglas de uso:
 *
 * - Ningún componente declara `fontSize` crudo: se usa `<Text variant="…">`.
 * - Cada variante define interlineado y tracking. Los estilos grandes tienen
 *   una versión compacta para ventanas con menos altura; el texto de lectura
 *   conserva su tamaño para no perder legibilidad.
 * - `maxFontScale` limita el escalado del sistema por variante para que los
 *   tamaños accesibles no rompan las cuadrículas de importe, teclado y botones.
 *   El mínimo del proyecto es 1.1 en cifras que ya se reducen para caber, y
 *   1.25 o más en el resto del texto.
 */
export const typography = {
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    fontFamily: fontFamily.medium,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontFamily: fontFamily.regular,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
    fontFamily: fontFamily.regular,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    fontFamily: fontFamily.medium,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.4,
    fontFamily: fontFamily.light,
  },
  bodyStrong: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
    fontFamily: fontFamily.bold,
  },
  subheading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontFamily: fontFamily.bold,
  },
  heading: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    fontFamily: fontFamily.bold,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    fontFamily: fontFamily.bold,
  },
  amount: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    fontFamily: fontFamily.bold,
  },
  amountHero: {
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.6,
    fontFamily: fontFamily.bold,
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;

/**
 * Ajustes para ventanas compactas.
 *
 * Solo se reducen estilos de presentación. Caption, etiquetas y cuerpo
 * mantienen la medida recomendada para lectura y dejan la adaptación de
 * accesibilidad al escalado de fuente del sistema.
 */
const compactTypography = {
  subheading: { fontSize: 19, lineHeight: 24 },
  heading: { fontSize: 24, lineHeight: 30 },
  title: { fontSize: 30, lineHeight: 36 },
  amount: { fontSize: 36, lineHeight: 42 },
  amountHero: { fontSize: 44, lineHeight: 50 },
} as const satisfies Partial<Record<TextVariant, TextStyle>>;

export function getTypographyStyle(
  variant: TextVariant,
  density: LayoutDensity,
): StyleProp<TextStyle> {
  if (density === 'compact' && variant in compactTypography) {
    return [
      typography[variant],
      compactTypography[variant as keyof typeof compactTypography],
    ];
  }

  return typography[variant];
}

/** Rampa semántica usada por Dynamic Type en iOS. */
export const dynamicTypeRamp = {
  overline: 'caption2',
  caption: 'caption1',
  footnote: 'footnote',
  label: 'subheadline',
  body: 'body',
  bodyStrong: 'headline',
  subheading: 'title3',
  heading: 'title2',
  title: 'title1',
  amount: 'title1',
  amountHero: 'largeTitle',
} as const satisfies Record<
  TextVariant,
  NonNullable<TextProps['dynamicTypeRamp']>
>;

/**
 * Límite de escalado del tamaño de fuente del sistema por variante.
 *
 * React Native no lo lee desde los estilos: lo aplica la primitiva `Text`
 * mediante `maxFontSizeMultiplier`.
 */
export const maxFontScale = {
  overline: 1.4,
  caption: 1.6,
  footnote: 1.6,
  label: 1.5,
  body: 1.5,
  bodyStrong: 1.5,
  subheading: 1.4,
  heading: 1.3,
  title: 1.25,
  amount: 1.15,
  amountHero: 1.1,
} as const satisfies Record<TextVariant, number>;

/** Familias disponibles para sobrescribir el énfasis propio de una variante. */
export const fontFamilyByWeight = {
  light: fontFamily.light,
  regular: fontFamily.regular,
  medium: fontFamily.medium,
  semibold: fontFamily.medium,
  bold: fontFamily.bold,
} as const satisfies Record<string, TextStyle['fontFamily']>;

export type FontWeight = keyof typeof fontFamilyByWeight;
