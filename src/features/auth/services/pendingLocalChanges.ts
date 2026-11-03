import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { retryPendingDisplayNameSync } from '@/features/profile/services/syncOwnDisplayName';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

/**
 * Filas que la app sube y que aún no confirmó el servidor. Las de importación
 * y las reglas de recordatorio van aparte (`countDeviceOnlyData`): hoy no
 * tienen subida, así que ningún reintento podría salvarlas.
 */
const pendingRowsQuery = `
  SELECT
    (SELECT COUNT(*) FROM categories WHERE sync_status <> 'synced') +
    (SELECT COUNT(*) FROM money_accounts WHERE sync_status <> 'synced') +
    (SELECT COUNT(*) FROM recurring_transaction_series
      WHERE sync_status <> 'synced') +
    (SELECT COUNT(*) FROM transactions WHERE sync_status <> 'synced') +
    (SELECT COUNT(*) FROM local_profile
      WHERE display_name_sync_status IN ('pending', 'failed')) +
    (SELECT COUNT(*) FROM local_profile
      WHERE avatar_sync_status IN ('pending', 'failed'))
  AS pending`;

/** Cambios guardados solo en este dispositivo; se perderían al cerrar sesión. */
export async function countPendingLocalChanges(): Promise<number> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ pending: number }>(
    pendingRowsQuery,
  );
  return row?.pending ?? 0;
}

export type DeviceOnlyData = {
  /** Importaciones sin terminar: lo ya importado son movimientos normales. */
  importBatches: number;
  /** Configuraciones de recordatorios de gastos o ingresos. */
  notificationRules: number;
};

/**
 * Datos que solo existen en este dispositivo porque no tienen subida. Cerrar
 * sesión también los borra: no se pueden salvar, pero sí avisar de ellos.
 */
export async function countDeviceOnlyData(): Promise<DeviceOnlyData> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<DeviceOnlyData>(
    `SELECT
       (SELECT COUNT(*) FROM import_batches
         WHERE status IN ('parsing', 'mapping_required', 'needs_review', 'ready'))
         AS importBatches,
       (SELECT COUNT(*) FROM transaction_notification_rules)
         AS notificationRules`,
  );
  return {
    importBatches: row?.importBatches ?? 0,
    notificationRules: row?.notificationRules ?? 0,
  };
}

/**
 * Intenta subir todo lo pendiente y devuelve cuántos cambios siguen sin
 * subir. Reutiliza las mismas subidas que la sincronización normal: cada
 * lote es idempotente por `installationId` e id local y se serializa por
 * espacio, así que reintentar no duplica movimientos. Un fallo de un espacio
 * no impide intentar los demás.
 */
export async function uploadPendingLocalChanges(): Promise<number> {
  const { spaces } = await loadSpaces();
  for (const space of spaces) {
    try {
      await syncSpaceDataForCurrentSession({
        spaceId: space.id,
        includeLocalOnly: true,
      });
    } catch (error) {
      console.error(
        `[signOut] No se pudieron subir los cambios del espacio ${space.id}:`,
        error,
      );
    }
  }
  for (const syncProfile of [retryPendingDisplayNameSync, syncOwnAvatar]) {
    try {
      await syncProfile();
    } catch (error) {
      console.error('[signOut] No se pudo subir el perfil:', error);
    }
  }
  return countPendingLocalChanges();
}
