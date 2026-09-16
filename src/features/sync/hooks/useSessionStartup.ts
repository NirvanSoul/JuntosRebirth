import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { endExpiredSession } from '@/features/auth/services/expiredSession';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';
import {
  classifySyncFailure,
  type SyncFailureKind,
} from '@/features/sync/services/syncFailure';
import {
  useSharedDataPolling,
  sharedDataMaxBackoffMs,
  sharedDataRefreshIntervalMs,
} from '@/features/sync/hooks/useSharedDataPolling';
import { markStartup } from '@/lib/diagnostics/startupTrace';
import { listLocalNotificationRules } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';
import { useNetworkAvailability } from '@/hooks/useNetworkAvailability';

export { sharedDataMaxBackoffMs, sharedDataRefreshIntervalMs };

type SessionStartupInput = {
  refreshSharedCoupleData: (
    partition?: string,
    options?: { mode?: 'full' | 'delta'; propagateFailure?: boolean },
  ) => Promise<void>;
  reloadLocalFinance: () => Promise<void>;
  reloadSpaces: () => Promise<void>;
  session: BetterAuthSession | null;
  setNotificationRules: Dispatch<SetStateAction<TransactionNotificationRule[]>>;
};

export type SyncIssue = {
  /** Cambia con cada fallo para que el aviso vuelva a mostrarse. */
  id: number;
  kind: Exclude<SyncFailureKind, 'expired'>;
};

type SessionStartupState = {
  /** Hay datos financieros que mostrar: la caché local o el snapshot ya restaurado. */
  isFinanceReady: boolean;
  /** Fallo de la inicialización remota pendiente de mostrar; nunca bloquea. */
  syncIssue: SyncIssue | null;
  dismissSyncIssue: (issueId: number) => void;
  /** Reintento explícito de la inicialización completa. */
  retrySession: () => void;
};

/**
 * Apertura de la sesión en la navegación principal.
 *
 * Es local-first: la caché de SQLite se muestra en cuanto se confirma que
 * pertenece a quien entra, y el bootstrap, el snapshot y la subida de cambios
 * pendientes siguen en segundo plano. Al terminar se vuelve a leer SQLite,
 * y solo entonces arranca el refresco periódico: repetir el snapshot que la
 * inicialización acaba de traer sería trabajo duplicado.
 *
 * Un fallo remoto no interrumpe: la caché sigue en pantalla y se expone un
 * aviso con reintento. Sin conexión, el reintento también ocurre solo al
 * recuperar la red; una sesión caducada cierra sesión sin aviso adicional.
 */
export function useSessionStartup(
  input: SessionStartupInput,
): SessionStartupState {
  const {
    refreshSharedCoupleData,
    reloadLocalFinance,
    reloadSpaces,
    session,
    setNotificationRules,
  } = input;
  const [isFinanceReady, setFinanceReady] = useState(false);
  // La inicialización terminó (con o sin éxito): a partir de aquí el
  // refresco periódico ya no compite con el snapshot inicial.
  const [isSessionSynced, setSessionSynced] = useState(false);
  const [syncIssue, setSyncIssue] = useState<SyncIssue | null>(null);
  const nextIssueId = useRef(0);
  // El efecto de apertura registra aquí cómo relanzarse; así el reintento
  // explícito y el de reconexión reutilizan la misma secuencia.
  const runOpenSessionRef = useRef<() => void>(() => undefined);
  const { isOffline } = useNetworkAvailability();

  const retrySession = useCallback(() => {
    setSyncIssue(null);
    runOpenSessionRef.current();
  }, []);
  const dismissSyncIssue = useCallback((issueId: number) => {
    setSyncIssue((current) => (current?.id === issueId ? null : current));
  }, []);

  // La caché se lee solo después de decidir si pertenece a esta sesión.
  useEffect(() => {
    let isMounted = true;

    const showLocalFinance = () => {
      markStartup('local_finance_ready');
      return reloadLocalFinance()
        .then(() => {
          if (isMounted) setFinanceReady(true);
        })
        .catch(() => undefined);
    };

    const openSession = async () => {
      try {
        if (session?.user) {
          await initializeAuthenticatedSession({
            onLocalCacheReady: (preparation) => {
              // Una caché descartada era de otra cuenta: no hay nada que
              // enseñar hasta que llegue el snapshot.
              if (preparation === 'kept' && isMounted) void showLocalFinance();
            },
          });
          await reloadSpaces();
        }
      } finally {
        // Un 5xx de bootstrap o snapshot no invalida ni descarta la caché.
        // Mostrarla permite seguir trabajando y deja la recuperación en manos
        // del botón explícito de reintento.
        markStartup('local_finance_ready');
        await reloadLocalFinance();
      }
      if (!isMounted) return;
      // Un fallo al cargar reglas no bloquea el acceso a las finanzas.
      void listLocalNotificationRules()
        .then((storedRules) => {
          if (!isMounted) return;
          setNotificationRules(storedRules);
        })
        .catch(() => undefined);
    };

    const runOpenSession = () =>
      openSession()
        .catch((error: unknown) => {
          console.error(
            '[MainTabsNavigator] Error al sincronizar sesión:',
            error,
          );
          // No cerrar la sesión nueva por una promesa tardía de la anterior.
          if (!isMounted) return;
          const kind = classifySyncFailure(error);
          if (kind === 'expired') {
            void endExpiredSession(error);
            return;
          }
          nextIssueId.current += 1;
          setSyncIssue({ id: nextIssueId.current, kind });
        })
        .finally(() => {
          if (!isMounted) return;
          setFinanceReady(true);
          setSessionSynced(true);
          markStartup('init_done');
        });

    runOpenSessionRef.current = () => void runOpenSession();
    runOpenSession();

    return () => {
      isMounted = false;
      runOpenSessionRef.current = () => undefined;
    };
  }, [reloadLocalFinance, reloadSpaces, session?.user, setNotificationRules]);

  // Recuperar la red es el momento natural de reintentar sin pedirlo.
  const wasOfflineRef = useRef(isOffline);
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;
    if (wasOffline && !isOffline && syncIssue?.kind === 'offline') {
      retrySession();
    }
  }, [isOffline, retrySession, syncIssue?.kind]);

  useSharedDataPolling({
    enabled: isSessionSynced && Boolean(session),
    onPoll: () =>
      refreshSharedCoupleData(undefined, {
        mode: 'delta',
        propagateFailure: true,
      }),
  });

  return { dismissSyncIssue, isFinanceReady, retrySession, syncIssue };
}
