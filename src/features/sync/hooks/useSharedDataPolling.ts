import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useNetworkAvailability } from '@/hooks/useNetworkAvailability';

/** Cadencia con la que se sincronizan los cambios compartidos mientras la app está activa. */
export const sharedDataRefreshIntervalMs = 2_000;
/** Techo máximo de retroceso exponencial ante fallos repetidos (5 minutos). */
export const sharedDataMaxBackoffMs = 5 * 60 * 1000;

export type SharedDataPollingInput = {
  enabled: boolean;
  onPoll: () => Promise<void>;
};

export function calculatePollingDelay(failureCount: number): number {
  const exponential = sharedDataRefreshIntervalMs * Math.pow(2, failureCount);
  return Math.min(exponential, sharedDataMaxBackoffMs);
}

/**
 * Cadencia de polling periódico para datos compartidos.
 *
 * - Cadencia de 2 segundos con retroceso exponencial ante errores (hasta 5 min).
 * - El primer tick tras activarse espera un intervalo completo (2 s) para
 *   evitar competir con la carga inicial.
 * - Pausa cuando AppState !== 'active' o cuando no hay red (offline).
 * - Al volver a estar activo o recuperar red, ejecuta un tick inmediato y
 *   retoma la cadencia normal.
 */
export function useSharedDataPolling(input: SharedDataPollingInput): void {
  const { enabled, onPoll } = input;
  const { isOffline } = useNetworkAvailability();
  const failuresRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);

  const onPollRef = useRef(onPoll);
  useEffect(() => {
    onPollRef.current = onPoll;
  });

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  });

  const isOfflineRef = useRef(isOffline);
  useEffect(() => {
    isOfflineRef.current = isOffline;
  });

  const getInitialAppState = (): AppStateStatus => {
    const raw =
      typeof AppState.currentState === 'function'
        ? (AppState.currentState as () => AppStateStatus)()
        : AppState.currentState;
    return raw === 'background' || raw === 'inactive' ? raw : 'active';
  };
  const appStateRef = useRef<AppStateStatus>(getInitialAppState());
  const wasEnabledRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const executePollRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const scheduleNext = useCallback(
    (delayMs: number) => {
      clearTimer();
      if (!isMountedRef.current) return;
      timerRef.current = setTimeout(() => {
        void executePollRef.current();
      }, delayMs);
    },
    [clearTimer],
  );

  const executePoll = useCallback(async () => {
    if (!isMountedRef.current) return;
    const isPaused =
      !enabledRef.current ||
      isOfflineRef.current ||
      appStateRef.current !== 'active';
    if (isPaused) return;

    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      await onPollRef.current();
      failuresRef.current = 0;
    } catch {
      failuresRef.current += 1;
    } finally {
      isPollingRef.current = false;
      if (isMountedRef.current) {
        const nextDelay = calculatePollingDelay(failuresRef.current);
        scheduleNext(nextDelay);
      }
    }
  }, [scheduleNext]);

  useEffect(() => {
    executePollRef.current = executePoll;
  }, [executePoll]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  // Manejo de AppState: pausar en background, tick inmediato al reactivar
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (
        prev !== 'active' &&
        nextState === 'active' &&
        enabled &&
        !isOffline
      ) {
        clearTimer();
        void executePoll();
      } else if (nextState !== 'active') {
        clearTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [clearTimer, enabled, executePoll, isOffline]);

  // Manejo de disponibilidad de red: tick inmediato al recuperar red
  const wasOfflineRef = useRef(isOffline);
  useEffect(() => {
    const wasOff = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    if (wasOff && !isOffline && enabled && appStateRef.current === 'active') {
      clearTimer();
      void executePoll();
    } else if (isOffline) {
      clearTimer();
    }
  }, [clearTimer, enabled, executePoll, isOffline]);

  // Manejo de habilitación: el primer tick espera un intervalo completo (2s)
  useEffect(() => {
    const justEnabled = !wasEnabledRef.current && enabled;
    wasEnabledRef.current = enabled;

    if (justEnabled) {
      failuresRef.current = 0;
      if (appStateRef.current === 'active' && !isOffline) {
        scheduleNext(sharedDataRefreshIntervalMs);
      }
    } else if (!enabled) {
      clearTimer();
      failuresRef.current = 0;
    }
  }, [clearTimer, enabled, isOffline, scheduleNext]);
}
