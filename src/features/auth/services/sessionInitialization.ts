import { prepareLocalCacheForSession } from '@/features/auth/services/prepareLocalCacheForSession';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';

export async function initializeAuthenticatedSession(): Promise<void> {
  // La caché local solo se descarta si pertenece a otra cuenta. Conservarla
  // cuando es de quien entra es lo que permite trabajar sin conexión: esas
  // filas siguen aquí y se suben en la sincronización de abajo. Esta decisión
  // pertenece a la inicialización de una sesión ya confirmada, no al
  // formulario de login: así un fallo de sincronización posterior nunca se
  // presenta como si el correo o la contraseña fueran incorrectos.
  await prepareLocalCacheForSession();
  await bootstrapRemoteAccount();

  // El onboarding puede haber elegido el país antes de que existiera una
  // sesión. Publícalo ahora, antes de pedir el snapshot: así el servidor crea
  // y devuelve el espacio personal del contexto monetario correcto.
  const { countryCode } = await getLocalProfile();
  if (countryCode) {
    await syncOwnCountry(countryCode, { ensureBootstrap: false });
  }

  // El snapshot crea los enlaces local→remoto. Sin él, el espacio local fijo
  // `personal` se enviaría erróneamente como si fuera su UUID remoto.
  await restoreRemoteAccountForCurrentSession();

  const { spaces } = await loadSpaces();

  for (const space of spaces) {
    try {
      // `local_only` son las filas que nunca llegaron a subirse, típicamente
      // creadas sin conexión. Ahora que la caché sobrevive al inicio de sesión
      // son trabajo real de esta cuenta, no restos de otra: excluirlas las
      // dejaría en el dispositivo para siempre.
      await syncSpaceDataForCurrentSession({
        spaceId: space.id,
        includeLocalOnly: true,
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
