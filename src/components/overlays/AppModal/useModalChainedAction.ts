import { useCallback, useRef } from 'react';

type ModalChainedAction = {
  /** Cierra la hoja y deja la acción pendiente hasta que termine el cierre. */
  closeThenRun: (action: () => void) => void;
  /** Se pasa a `onDismissed` de `AppModal`. */
  handleDismissed: () => void;
};

/**
 * Encadena hojas sin solaparlas: cerrar una y presentar otra en el mismo
 * commit deja la pila de `@gorhom/bottom-sheet` a medio camino y la segunda
 * no llega a presentarse (la primera vez funciona y las siguientes no).
 */
export function useModalChainedAction(onClose: () => void): ModalChainedAction {
  const pendingActionRef = useRef<(() => void) | null>(null);
  const closeThenRun = useCallback(
    (action: () => void) => {
      pendingActionRef.current = action;
      onClose();
    },
    [onClose],
  );
  const handleDismissed = useCallback(() => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  }, []);

  return { closeThenRun, handleDismissed };
}
