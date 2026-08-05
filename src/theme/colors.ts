import type { ColorTokens } from '@/theme/types';

const cta = '#9933FF';

export const lightColors = {
  background: '#EDEEF0',
  surface: '#FFFFFF',
  surfaceMuted: '#E9EDE7',
  modalBackground: '#F4F4F8',
  keypad: '#E5E6EB',
  brand: '#244D3B',
  brandPressed: '#19392B',
  brandSoft: '#DDEBE3',
  onBrand: '#FFFFFF',
  textPrimary: '#17201A',
  textSecondary: '#4C5A50',
  textMuted: '#718078',
  border: '#DCE3DC',
  categoryPreviewBorder: '#EEEEEE',
  income: '#00CB55',
  incomeSoft: '#00CB55',
  expense: '#FF0047',
  expenseSoft: '#FF0047',
  cta,
  ctaSoft: '#F1E3FF',
  ctaPressed: '#7A29CC',
  categoryAction: cta,
  overlay: 'rgba(13, 25, 18, 0.44)',
  overlaySoft: 'rgba(13, 25, 18, 0.18)',
} as const satisfies ColorTokens;

export const darkColors = {
  background: '#121412',
  surface: '#1E211E',
  surfaceMuted: '#252825',
  modalBackground: '#181B18',
  keypad: '#2A2D2A',
  brand: '#5CB88A',
  brandPressed: '#4A9A72',
  brandSoft: '#1A3328',
  onBrand: '#FFFFFF',
  textPrimary: '#E8ECE8',
  textSecondary: '#B4BEB6',
  textMuted: '#8A948C',
  border: '#3A403A',
  categoryPreviewBorder: '#333633',
  income: '#00E066',
  incomeSoft: '#00E066',
  expense: '#FF3370',
  expenseSoft: '#FF3370',
  cta: '#B366FF',
  ctaSoft: '#2A1A3D',
  ctaPressed: '#9933FF',
  categoryAction: '#B366FF',
  overlay: 'rgba(0, 0, 0, 0.58)',
  overlaySoft: 'rgba(0, 0, 0, 0.34)',
} as const satisfies ColorTokens;

/** Alias estable para pruebas y valores por defecto del modo claro. */
export const colors = lightColors;

export function resolveColorTokens(scheme: 'light' | 'dark'): ColorTokens {
  return scheme === 'dark' ? darkColors : lightColors;
}
