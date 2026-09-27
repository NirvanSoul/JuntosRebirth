import type { ViewStyle } from 'react-native';

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  modalBackground: string;
  keypad: string;
  brand: string;
  brandPressed: string;
  brandSoft: string;
  onBrand: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  categoryPreviewBorder: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  cta: string;
  ctaSoft: string;
  ctaPressed: string;
  categoryAction: string;
  overlay: string;
  overlaySoft: string;
};

export type AppearancePreference = 'light' | 'dark' | 'system';

export type ColorScheme = 'light' | 'dark';

export type ShadowStyle = Required<Pick<ViewStyle, 'boxShadow'>>;

export type ThemeShadows = {
  /** Sombra informativa de cards y controles en reposo. */
  subtle: ShadowStyle;
  /** Variante más marcada de `subtle` para controles destacados. */
  raised: ShadowStyle;
  floatingAction: ShadowStyle;
  mainMenu: ShadowStyle;
  /** Anula la sombra heredada (estados seleccionados, planos). */
  none: ShadowStyle;
};
