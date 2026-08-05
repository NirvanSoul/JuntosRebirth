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

export type ThemeShadows = {
  subtle: {
    elevation: number;
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  mainMenu: {
    elevation: number;
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
};
