import { useCallback, useState, type SetStateAction } from 'react';

const sessionValues = new Map<string, unknown>();

/**
 * Como `useState`, pero el valor sobrevive mientras la app siga abierta: si la
 * pantalla se vuelve a montar (al cambiar de pestaña, de espacio o al rehacerse
 * el navegador) recupera el último valor. Solo vive en memoria, así que al
 * cerrar la app vuelve al inicial. Sin `key` se comporta como `useState`.
 */
export function useSessionState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(() =>
    key !== null && sessionValues.has(key)
      ? (sessionValues.get(key) as T)
      : initial,
  );
  const setSessionValue = useCallback(
    (next: SetStateAction<T>) => {
      setValue((current) => {
        const resolved =
          typeof next === 'function'
            ? (next as (previous: T) => T)(current)
            : next;
        if (key !== null) sessionValues.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, setSessionValue] as const;
}

/** Olvida todo lo guardado; los tests lo usan para no arrastrar estado. */
export function clearSessionState(): void {
  sessionValues.clear();
}
