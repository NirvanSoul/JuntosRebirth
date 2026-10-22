import type { FontSource } from 'expo-font';

/** Familias estáticas cargadas con nombres idénticos en todas las plataformas. */
export const fontFamily = {
  light: 'Gilroy-Light',
  regular: 'Gilroy-Regular',
  medium: 'Gilroy-Medium',
  bold: 'Gilroy-Bold',
} as const;

export type FontFamily = (typeof fontFamily)[keyof typeof fontFamily];

/**
 * Assets TTF para `useFonts`. En los builds nativos van además incrustados en
 * el binario (plugin `expo-font` de `app.json`): `useFonts` los encuentra ya
 * registrados y no retrasa la primera pantalla. En Expo Go se cargan aquí.
 * El nombre PostScript de cada archivo coincide con su clave.
 */
export const fontAssets = {
  [fontFamily.light]: require('../../assets/fonts/Gilroy-Light.ttf'),
  [fontFamily.regular]: require('../../assets/fonts/Gilroy-Regular.ttf'),
  [fontFamily.medium]: require('../../assets/fonts/Gilroy-Medium.ttf'),
  [fontFamily.bold]: require('../../assets/fonts/Gilroy-Bold.ttf'),
} as const satisfies Record<FontFamily, FontSource>;
