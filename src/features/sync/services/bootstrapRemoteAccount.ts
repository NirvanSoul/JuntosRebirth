import { apiClient } from '@/services/api/juntossApiClient';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { deviceTimeZone } from '@/utils/deviceTimeZone';

const bootstrapInFlightBySession = new Map<string, Promise<void>>();

export async function bootstrapRemoteAccount(): Promise<void> {
  // Better Auth identifica la sesión que autoriza el POST. No se comparte un
  // bootstrap entre dos cuentas que puedan alternarse en el mismo dispositivo.
  const userId = await getAuthenticatedUserId();
  // Sin una identidad confirmada no se puede saber si dos peticiones son de la
  // misma cuenta; se comparte una única promesa provisional. La siguiente
  // sesión autenticada la sustituye por su clave de usuario antes de escribir
  // datos locales.
  const sessionKey = userId ?? '__unresolved-session__';
  const existing = bootstrapInFlightBySession.get(sessionKey);
  if (existing) return existing;

  let task: Promise<void>;
  task = performBootstrapRemoteAccount().finally(() => {
    if (bootstrapInFlightBySession.get(sessionKey) === task) {
      bootstrapInFlightBySession.delete(sessionKey);
    }
  });
  bootstrapInFlightBySession.set(sessionKey, task);
  return task;
}

async function performBootstrapRemoteAccount(): Promise<void> {
  const timezone = deviceTimeZone();
  // El contrato remoto usa `timezone` (IANA); `timeZone` se rechaza como un
  // campo desconocido con 400 y deja a la cuenta sin inicializar. No se
  // reintenta aquí: una persona elige "Reintentar" desde el estado de sync.
  await apiClient.post('/v1/bootstrap', { timezone });
}
