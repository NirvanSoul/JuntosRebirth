import { useWindowDimensions } from 'react-native';

import { type LayoutDensity, resolveLayoutDensity } from '@/theme/layout';

/**
 * Densidad de disposición para la ventana actual.
 *
 * Se recalcula al rotar el dispositivo o al cambiar el tamaño de ventana, y es
 * la única entrada de adaptación al tamaño de pantalla del sistema de diseño.
 */
export function useLayoutDensity(): LayoutDensity {
  const { height } = useWindowDimensions();

  return resolveLayoutDensity(height);
}
