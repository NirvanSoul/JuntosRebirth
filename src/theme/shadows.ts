import type { ColorScheme, ThemeShadows } from '@/theme/types';

/**
 * Las sombras se expresan con `boxShadow` (sintaxis CSS) porque es la única
 * propiedad que Android e iOS pintan igual: las props clásicas
 * (`shadowOffset`, `shadowOpacity`, `shadowRadius`) solo existen en iOS y
 * `elevation` en Android ignora desenfoque, desplazamiento y opacidad.
 */
function boxShadow(offsetY: number, blur: number, opacity: number): string {
  return `0 ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`;
}

function createShadows(scheme: ColorScheme): ThemeShadows {
  const isDark = scheme === 'dark';

  return {
    subtle: {
      boxShadow: isDark ? boxShadow(2, 8, 0.32) : boxShadow(6, 24, 0.05),
    },
    raised: {
      boxShadow: isDark ? boxShadow(2, 8, 0.32) : boxShadow(6, 24, 0.12),
    },
    floatingAction: {
      boxShadow: isDark ? boxShadow(4, 16, 0.44) : boxShadow(4, 16, 0.2),
    },
    mainMenu: {
      boxShadow: isDark ? boxShadow(-4, 8, 0.32) : boxShadow(-4, 24, 0.05),
    },
    none: {
      boxShadow: [],
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
