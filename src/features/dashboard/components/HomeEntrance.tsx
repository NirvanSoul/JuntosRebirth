import { Children, type PropsWithChildren } from 'react';
import Animated from 'react-native-reanimated';

import { getStartupEntering } from '@/theme/transitions';

type HomeEntranceProps = PropsWithChildren<{
  /**
   * Cuando cambia, cada bloque vuelve a montarse y repite su entrada
   * (p. ej. al cambiar de espacio o de moneda).
   */
  revealKey?: string;
  startIndex?: number;
}>;

/** Cada bloque entra por separado; el orden permanece estable al actualizar datos. */
export function HomeEntrance({
  children,
  revealKey,
  startIndex = 0,
}: HomeEntranceProps) {
  return Children.map(children, (child, index) =>
    child == null ? null : (
      <Animated.View
        entering={getStartupEntering(startIndex + index)}
        key={revealKey === undefined ? index : `${revealKey}:${index}`}
      >
        {child}
      </Animated.View>
    ),
  );
}
