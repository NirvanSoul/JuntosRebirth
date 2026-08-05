import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Ejecuta `onForeground` cada vez que la app vuelve a primer plano
 * (transición hacia el estado `active`), sin ejecutarlo en el montaje inicial.
 */
export function useAppForeground(onForeground: () => void): void {
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;

  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (appStateRef.current !== 'active' && nextState === 'active') {
          callbackRef.current();
        }
        appStateRef.current = nextState;
      },
    );

    return () => subscription.remove();
  }, []);
}
