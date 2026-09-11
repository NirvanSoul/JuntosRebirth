import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import type { BetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { endExpiredSession } from '@/features/auth/services/expiredSession';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';
import { listLocalNotificationRules } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type { TransactionNotificationRule } from '@/features/transactions/types';

/** Cadencia con la que se baja el snapshot compartido mientras la app está abierta. */
export const sharedDataRefreshIntervalMs = 15_000;

type SessionStartupInput = {
  refreshSharedCoupleData: () => Promise<void>;
  reloadLocalFinance: () => Promise<void>;
  reloadSpaces: () => Promise<void>;
  session: BetterAuthSession | null;
  setNotificationRules: Dispatch<SetStateAction<TransactionNotificationRule[]>>;
};

type SessionStartupState = {
  /** Hay datos financieros que mostrar: la caché local o el snapshot ya restaurado. */
  isFinanceReady: boolean;
};

/**
 * Apertura de la sesión en la navegación principal.
 *
 * Es local-first: la caché de SQLite se muestra en cuanto se confirma que
 * pertenece a quien entra, y el bootstrap, el snapshot y la subida de cambios
 * pendientes siguen en segundo plano. Al terminar se vuelve a leer SQLite,
 * y solo entonces arranca el refresco periódico: repetir el snapshot que la
 * inicialización acaba de traer sería trabajo duplicado.
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

  // La caché se lee solo después de decidir si pertenece a esta sesión.
  useEffect(() => {
    let isMounted = true;

    const showLocalFinance = () =>
      reloadLocalFinance()
        .then(() => {
          if (isMounted) setFinanceReady(true);
        })
        .catch(() => undefined);

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
          if (isMounted) {
            void endExpiredSession(error);
            Alert.alert(
              'No pudimos sincronizar tus datos',
              'Tus datos locales siguen guardados en este dispositivo.',
              [
                { text: 'Ahora no', style: 'cancel' },
                { text: 'Reintentar', onPress: () => void runOpenSession() },
              ],
            );
          }
        })
        .finally(() => {
          if (!isMounted) return;
          setFinanceReady(true);
          setSessionSynced(true);
        });

    runOpenSession();

    return () => {
      isMounted = false;
    };
  }, [reloadLocalFinance, reloadSpaces, session?.user, setNotificationRules]);

  useEffect(() => {
    if (!isSessionSynced || !session) return;

    // La inicialización acaba de dejar el snapshot en SQLite: el primer
    // refresco espera un intervalo completo en vez de repetirlo al instante.
    const refreshTimer = setInterval(() => {
      void refreshSharedCoupleData();
    }, sharedDataRefreshIntervalMs);
    return () => clearInterval(refreshTimer);
  }, [isSessionSynced, refreshSharedCoupleData, session]);

  return { isFinanceReady };
}
