import type { ViewStyle } from 'react-native';

import type { ColorScheme, ThemeShadows } from '@/theme/types';

function createShadows(scheme: ColorScheme): ThemeShadows {
  const shadowColor = scheme === 'dark' ? '#000000' : '#000000';
  const shadowOpacity = scheme === 'dark' ? 0.32 : 0.05;

  const subtle = {
    elevation: scheme === 'dark' ? 0 : 1,
    shadowColor,
    shadowOffset: { width: 0, height: scheme === 'dark' ? 2 : 6 },
    shadowOpacity,
    shadowRadius: scheme === 'dark' ? 4 : 12,
  } as const satisfies ViewStyle;

  return {
    subtle,
    floatingAction: {
      elevation: 6,
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: scheme === 'dark' ? 0.44 : 0.2,
      shadowRadius: 8,
    },
    mainMenu: {
      ...subtle,
      shadowOffset: { width: 0, height: -4 },
    },
  };
}

export const lightShadows = createShadows('light');
export const darkShadows = createShadows('dark');

/** Alias estable para pruebas y valores por defecto del modo claro. */
export const shadows = lightShadows;

export function resolveShadows(scheme: ColorScheme): ThemeShadows {
  return scheme === 'dark' ? darkShadows : lightShadows;
}
