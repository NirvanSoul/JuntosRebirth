import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

/**
 * Desenfoque con velo de las capas que tapan la pantalla (fondo de las hojas y
 * acciones de una tarjeta). No recibe toques: quien lo usa decide qué pasa al
 * tocar fuera. Android necesita el método `dimezisBlurView` para desenfocar
 * de verdad en lugar de pintar solo un tinte.
 */
export function BlurScrim() {
  const { isDark } = useTheme();
  const themedStyles = useThemedStyles(createThemedStyles);

  return (
    <>
      <BlurView
        blurReductionFactor={2}
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : undefined
        }
        intensity={20}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        tint={isDark ? 'dark' : 'light'}
      />
      <View pointerEvents="none" style={themedStyles.shade} />
    </>
  );
}

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    shade: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlaySoft,
    },
  });
}
