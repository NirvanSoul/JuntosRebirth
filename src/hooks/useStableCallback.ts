import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Devuelve una función con identidad fija que siempre ejecuta la versión más
 * reciente de `callback`. Sirve para pasar manejadores de eventos a hojas y
 * pantallas memoizadas sin que cada render del padre las vuelva a pintar.
 *
 * Solo para manejadores de eventos: llamarla durante el render ejecutaría la
 * versión del render anterior.
 */
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Args) => callbackRef.current(...args), []);
}
