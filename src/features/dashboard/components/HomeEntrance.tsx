import { Children, type PropsWithChildren } from 'react';
import Animated from 'react-native-reanimated';

import { getStartupEntering } from '@/theme/transitions';

type HomeEntranceProps = PropsWithChildren<{
  startIndex?: number;
}>;

/** Cada bloque entra por separado; el orden permanece estable al actualizar datos. */
export function HomeEntrance({ children, startIndex = 0 }: HomeEntranceProps) {
  return Children.map(children, (child, index) =>
    child == null ? null : (
      <Animated.View
        entering={getStartupEntering(startIndex + index)}
        key={index}
      >
        {child}
      </Animated.View>
    ),
  );
}
