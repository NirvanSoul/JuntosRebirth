import {
  type LocalCachePreparation,
  prepareLocalCacheForSession,
} from '@/features/auth/services/prepareLocalCacheForSession';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import { restoreOwnProfile } from '@/features/profile/services/restoreOwnProfile';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';

type SessionInitializationOptions = {
  /**
   * Se invoca en cuanto se decide que la caché local es de quien entra
   * (`kept`), antes de la primera petición de red. Quien escucha puede
   * mostrar esa caché mientras el resto de la inicialización sigue en
   * segundo plano. Con `discarded` no hay nada local que mostrar.
   */
  onLocalCacheReady?: (preparation: LocalCachePreparation) => void;
};

type LocalCacheListener = (preparation: LocalCachePreparation) => void;

type SessionInitialization = {
  task: Promise<void>;
  /** Resultado de la etapa local, o `null` mientras no se ha decidido. */
  localCache: LocalCachePreparation | null;
  localCacheListeners: LocalCacheListener[];
};

let initializationInFlight: SessionInitialization | null = null;

export function initializeAuthenticatedSession(
  options: SessionInitializationOptions = {},
): Promise<void> {
  if (!initializationInFlight) {
    const started: SessionInitialization = {
      task: Promise.resolve(),
      localCache: null,
      localCacheListeners: [],
    };
    started.task = performSessionInitialization(started).finally(() => {
      if (initializationInFlight === started) initializationInFlight = null;
    });
    initializationInFlight = started;
  }

  const current = initializationInFlight;
  if (options.onLocalCacheReady) {
    // Quien se suma a una inicialización en curso recibe la decisión ya
    // tomada; el resto la recibe en el momento en que se toma.
    if (current.localCache) options.onLocalCacheReady(current.localCache);
    else current.localCacheListeners.push(options.onLocalCacheReady);
  }
  return current.task;
}

async function performSessionInitialization(
  initialization: SessionInitialization,
): Promise<void> {
  // La caché local solo se descarta si pertenece a otra cuenta. Conservarla
  // cuando es de quien entra es lo que permite trabajar sin conexión: esas
  // filas siguen aquí y se suben en la sincronización de abajo. Esta decisión
  // pertenece a la inicialización de una sesión ya confirmada, no al
  // formulario de login: así un fallo de sincronización posterior nunca se
  // presenta como si el correo o la contraseña fueran incorrectos.
  const preparation = await prepareLocalCacheForSession();
  initialization.localCache = preparation;
  // Se avisa antes de la primera petición de red, de forma síncrona: así la
  // caché puede mostrarse sin esperar a que arranque el bootstrap.
  const listeners = initialization.localCacheListeners.splice(0);
  for (const listener of listeners) listener(preparation);

  await bootstrapRemoteAccount();
  const remoteCountryCode = await restoreOwnProfile();

  // El onboarding puede haber elegido el país antes de que existiera una
  // sesión. Publícalo ahora, antes de pedir el snapshot: así el servidor crea
  // y devuelve el espacio personal del contexto monetario correcto.
  const { countryCode } = await getLocalProfile();
  if (countryCode && countryCode !== remoteCountryCode) {
    await syncOwnCountry(countryCode, { ensureBootstrap: false });
  }

  // El snapshot crea los enlaces local→remoto. Sin él, el espacio local fijo
  // `personal` se enviaría erróneamente como si fuera su UUID remoto.
  await restoreRemoteAccountForCurrentSession();

  const { spaces } = await loadSpaces();

  let needsFinalRestore = false;
  for (const space of spaces) {
    try {
      // `local_only` son las filas que nunca llegaron a subirse, típicamente
      // creadas sin conexión. Ahora que la caché sobrevive al inicio de sesión
      // son trabajo real de esta cuenta, no restos de otra: excluirlas las
      // dejaría en el dispositivo para siempre.
      const uploaded = await syncSpaceDataForCurrentSession({
        spaceId: space.id,
        includeLocalOnly: true,
      });
      needsFinalRestore ||= Object.values(uploaded).some((count) => count > 0);
    } catch (spaceSyncError) {
      // El servidor pudo aceptar el lote y perderse solo la respuesta.
      needsFinalRestore = true;
      console.error(
        `[sessionInitialization] Error sincronizando espacio ${space.id}:`,
        spaceSyncError,
      );
    }
  }

  // Sin subidas, el primer snapshot ya es la versión que debe mostrarse.
  if (needsFinalRestore) await restoreRemoteAccountForCurrentSession();
}
