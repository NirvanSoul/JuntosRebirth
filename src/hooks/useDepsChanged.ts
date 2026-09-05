import { useState } from 'react';

/**
 * Detecta si alguno de `deps` cambió desde el último render, comparando por
 * igualdad referencial (como el arreglo de dependencias de un efecto).
 *
 * Sirve para reemplazar el patrón `useEffect(() => { setX(...); }, deps)`
 * cuando el cuerpo es puramente síncrono (sin cleanup ni I/O): React admite
 * llamar al setter durante el render para ajustar estado a partir de props
 * (https://react.dev/learn/you-might-not-need-an-effect), y evita el aviso
 * de la regla `react-hooks/set-state-in-effect`.
 */
export function useDepsChanged(deps: readonly unknown[]): boolean {
  const [prevDeps, setPrevDeps] = useState<readonly unknown[] | null>(null);
  const changed =
    prevDeps === null ||
    deps.length !== prevDeps.length ||
    deps.some((dep, index) => dep !== prevDeps[index]);
  if (changed) {
    setPrevDeps(deps);
  }
  return changed;
}
