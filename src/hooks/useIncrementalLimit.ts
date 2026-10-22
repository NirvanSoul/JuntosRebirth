import { useCallback, useState } from 'react';

import { useDepsChanged } from '@/hooks/useDepsChanged';

/**
 * Límite de una lista larga que crece por páginas al acercarse al final.
 *
 * Así montar la pantalla o cambiar un filtro cuesta una página y no el
 * historial entero. Vuelve a la primera página solo cuando cambia `resetDeps`
 * (los filtros), no con cada recarga de datos: si no, la lista se recortaría
 * bajo el dedo de quien está desplazándose.
 */
export function useIncrementalLimit(
  pageSize: number,
  resetDeps: readonly unknown[],
): { limit: number; showMore: () => void } {
  const [limit, setLimit] = useState(pageSize);
  if (useDepsChanged(resetDeps) && limit !== pageSize) {
    setLimit(pageSize);
  }
  const showMore = useCallback(
    () => setLimit((current) => current + pageSize),
    [pageSize],
  );

  return { limit, showMore };
}
