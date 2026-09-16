import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { listLocalMoneyAccounts } from '@/features/accounts/repositories/localMoneyAccountRepository';
import type { MoneyAccount } from '@/features/accounts/types';
import type { BetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { endExpiredSession } from '@/features/auth/services/expiredSession';
import { listLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import { restoreOwnProfile } from '@/features/profile/services/restoreOwnProfile';
import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { retryPendingDisplayNameSync } from '@/features/profile/services/syncOwnDisplayName';
import { syncSpaceMemberProfiles } from '@/features/profile/services/syncSpaceMemberProfiles';
import { isAwaitingPartnerSpace, type Space } from '@/features/spaces/types';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { listLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import { reconcileNotificationRules } from '@/features/transactions/services/notificationRuleService';
import type { SessionTransaction } from '@/features/transactions/types';

type FinanceSyncInput = {
  refreshCoupleSpace: () => Promise<void>;
  reloadCurrencyPreferences: () => Promise<void>;
  reloadSpaces: () => Promise<void>;
  session: BetterAuthSession | null;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setMoneyAccounts: Dispatch<SetStateAction<MoneyAccount[]>>;
  setTransactions: Dispatch<SetStateAction<SessionTransaction[]>>;
  spaces: readonly Space[];
};

type FinanceSyncController = {
  /** Vuelca la caché local de SQLite al estado de la pantalla. */
  reloadLocalFinance: () => Promise<void>;
  /** Sube lo pendiente y baja el snapshot remoto; sin `spaceId`, de todos. */
  refreshSharedCoupleData: (
    spaceId?: string,
    options?: { mode?: 'full' | 'delta'; propagateFailure?: boolean },
  ) => Promise<void>;
  /** Comprueba el espacio de pareja antes de sincronizar sus datos. */
  refreshCoupleSpaceAndData: () => Promise<void>;
  /** Recarga tras un cambio de país, que activa otro contexto financiero. */
  refreshFinancialContext: () => Promise<void>;
};

/**
 * Sincronización de los datos financieros de la sesión.
 *
 * Vive fuera de `MainTabsNavigator` porque son cinco operaciones encadenadas
 * cuyo orden importa, y leerlas juntas es lo que deja ver que ninguna puede
 * cerrar la sesión de otra ni escapar como rechazo sin capturar.
 */
export function useFinanceSync(input: FinanceSyncInput): FinanceSyncController {
  const {
    refreshCoupleSpace,
    reloadCurrencyPreferences,
    reloadSpaces,
    session,
    setCategories,
    setMoneyAccounts,
    setTransactions,
    spaces,
  } = input;
  // Evita que un 401 tardío de una sesión desmontada cierre la sesión nueva.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reloadLocalFinance = useCallback(async (): Promise<void> => {
    const [storedCategories, storedMoneyAccounts, storedTransactions] =
      await Promise.all([
        listLocalCategories(),
        listLocalMoneyAccounts(),
        listLocalTransactions(),
      ]);
    setCategories(storedCategories);
    setMoneyAccounts(storedMoneyAccounts);
    setTransactions(storedTransactions);
    void reconcileNotificationRules({
      categories: storedCategories,
      transactions: storedTransactions,
    }).catch(() => undefined);
  }, [setCategories, setMoneyAccounts, setTransactions]);

  const syncAllUserSpaces = useCallback(async (): Promise<void> => {
    if (!session) return;
    for (const space of spaces) {
      if (isAwaitingPartnerSpace(space)) {
        continue;
      }
      try {
        await syncSpaceDataForCurrentSession({ spaceId: space.id });
      } catch (error) {
        console.error('[sync] Subida de espacio compartido falló:', error);
      }
    }
  }, [session, spaces]);

  const refreshMemberProfiles = useCallback(
    async (spaceId?: string): Promise<void> => {
      await retryPendingDisplayNameSync();
      await syncOwnAvatar();
      try {
        await restoreOwnProfile();
      } catch (error) {
        console.error(
          '[profiles] Restauración del perfil propio falló:',
          error,
        );
      }
      const sharedSpaces = spaces.filter(
        (space) =>
          space.type !== 'personal' &&
          !isAwaitingPartnerSpace(space) &&
          (!spaceId || space.id === spaceId),
      );
      for (const space of sharedSpaces) {
        try {
          await syncSpaceMemberProfiles(space.id);
        } catch (error) {
          console.error('[profiles] Sincronización del censo falló:', error);
        }
      }
    },
    [spaces],
  );

  const refreshSharedCoupleData = useCallback(
    async (
      spaceId?: string,
      options?: { mode?: 'full' | 'delta'; propagateFailure?: boolean },
    ): Promise<void> => {
      if (!session) return;

      if (spaceId) {
        const targetSpace = spaces.find((space) => space.id === spaceId);
        if (targetSpace && !isAwaitingPartnerSpace(targetSpace)) {
          try {
            await syncSpaceDataForCurrentSession({ spaceId });
          } catch (error) {
            console.error('[sync] Subida de espacio compartido falló:', error);
          }
        }
      } else {
        await syncAllUserSpaces();
      }

      try {
        const mode = options?.mode ?? 'full';
        const restored = await restoreRemoteAccountForCurrentSession({ mode });
        if (restored.outcome.catalogueChanged) {
          await reloadSpaces();
        }
        if (mode === 'full' || restored.outcome.receivedRows > 0) {
          await reloadLocalFinance();
        }
      } catch (error) {
        // Un 401 tardío de una instancia desmontada pertenece a la sesión anterior.
        if (isMountedRef.current) void endExpiredSession(error);
        // El polling necesita observar el rechazo para aplicar su backoff.
        // Es un reintento previsto de fondo, no un error accionable para quien
        // usa la app: no se ensucia la consola con cada corte transitorio.
        if (options?.propagateFailure) throw error;
        // Las acciones explícitas de interfaz conservan el diagnóstico actual
        // y siguen mostrando la caché local.
        console.error('[sync] Restauración remota falló:', error);
      }
      await refreshMemberProfiles(spaceId);
    },
    [
      refreshMemberProfiles,
      reloadLocalFinance,
      reloadSpaces,
      session,
      syncAllUserSpaces,
      spaces,
    ],
  );

  const refreshCoupleSpaceAndData = useCallback(async (): Promise<void> => {
    await refreshCoupleSpace();
    await refreshSharedCoupleData();
  }, [refreshCoupleSpace, refreshSharedCoupleData]);

  // Cambiar de país activa otro contexto financiero. El orden es obligatorio:
  // la restauración remota deja en SQLite los espacios y preferencias del país
  // nuevo, y solo entonces pueden leerlos las tres recargas siguientes.
  const refreshFinancialContext = useCallback(
    (): Promise<void> =>
      restoreRemoteAccountForCurrentSession()
        .then(reloadCurrencyPreferences)
        .then(reloadSpaces)
        .then(reloadLocalFinance),
    [reloadCurrencyPreferences, reloadLocalFinance, reloadSpaces],
  );

  return {
    reloadLocalFinance,
    refreshSharedCoupleData,
    refreshCoupleSpaceAndData,
    refreshFinancialContext,
  };
}
