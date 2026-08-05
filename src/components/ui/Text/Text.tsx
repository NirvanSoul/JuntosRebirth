import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { useTheme } from '@/theme/useTheme';
import type { ColorTokens } from '@/theme/types';
import {
  type FontWeight,
  dynamicTypeRamp,
  fontFamilyByWeight,
  getTypographyStyle,
  maxFontScale,
  type TextVariant,
} from '@/theme/typography';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'cta'
  | 'onBrand'
  | 'onBrandMuted'
  | 'income'
  | 'expense';

function resolveToneColor(tone: TextTone, colors: ColorTokens): string {
  switch (tone) {
    case 'primary':
      return colors.textPrimary;
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'brand':
      return colors.brand;
    case 'cta':
      return colors.cta;
    case 'onBrand':
      return colors.onBrand;
    case 'onBrandMuted':
      return colors.brandSoft;
    case 'income':
      return colors.income;
    case 'expense':
      return colors.expense;
  }
}

export type TextProps = Omit<RNTextProps, 'dynamicTypeRamp'> & {
  /** Variante de la escala tipográfica. Define tamaño, interlineado y peso. */
  variant?: TextVariant;
  /** Color del texto tomado de los tokens de tema. */
  tone?: TextTone;
  /** Peso alternativo cuando la variante necesita otro énfasis. */
  weight?: FontWeight;
  align?: TextStyle['textAlign'];
};

/**
 * Texto del sistema de diseño.
 *
 * Es el único punto donde se declaran tamaños de fuente: aplica la variante
 * elegida y limita el escalado del sistema con el tope definido para esa
 * variante, de modo que los tamaños accesibles no rompan la disposición.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  weight,
  align,
  maxFontSizeMultiplier,
  style,
  ...rest
}: TextProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();

  return (
    <RNText
      dynamicTypeRamp={dynamicTypeRamp[variant]}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? maxFontScale[variant]}
      style={[
        getTypographyStyle(variant, density),
        { color: resolveToneColor(tone, colors) },
        weight ? { fontFamily: fontFamilyByWeight[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
