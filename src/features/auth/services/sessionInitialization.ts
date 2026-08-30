import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';

export async function initializeAuthenticatedSession(): Promise<void> {
  await bootstrapRemoteAccount();

  // El snapshot crea los enlaces local→remoto. Sin él, el espacio local fijo
  // `personal` se enviaría erróneamente como si fuera su UUID remoto.
  await restoreRemoteAccountForCurrentSession();

  const { spaces } = await loadSpaces();

  for (const space of spaces) {
    try {
      await syncSpaceDataForCurrentSession({
        spaceId: space.id,
        includeLocalOnly: false,
      });
    } catch (spaceSyncError) {
      console.error(
        `[sessionInitialization] Error sincronizando espacio ${space.id}:`,
        spaceSyncError,
      );
    }
  }

  await restoreRemoteAccountForCurrentSession();
}
