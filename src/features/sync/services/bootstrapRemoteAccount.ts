import { apiClient } from '@/services/api/juntossApiClient';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';

const bootstrapInFlightByUserId = new Map<string, Promise<void>>();

export async function bootstrapRemoteAccount(retries = 2): Promise<void> {
  // Better Auth identifica la sesión que autoriza el POST. No se comparte un
  // bootstrap entre dos cuentas que puedan alternarse en el mismo dispositivo.
  const userId = await getAuthenticatedUserId();
  // Sin una identidad confirmada no se puede saber si dos peticiones son de la
  // misma cuenta; no compartirlas evita cruzar un cambio de sesión.
  if (!userId) return performBootstrapRemoteAccount(retries);
  const existing = bootstrapInFlightByUserId.get(userId);
  if (existing) return existing;

  let task: Promise<void>;
  task = performBootstrapRemoteAccount(retries).finally(() => {
    if (bootstrapInFlightByUserId.get(userId) === task) {
      bootstrapInFlightByUserId.delete(userId);
    }
  });
  bootstrapInFlightByUserId.set(userId, task);
  return task;
}

async function performBootstrapRemoteAccount(retries: number): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // El contrato remoto usa `timezone` (IANA); `timeZone` se rechaza como
      // un campo desconocido con 400 y deja a la cuenta sin inicializar.
      await apiClient.post('/v1/bootstrap', { timezone });
      return;
    } catch (error) {
      if (attempt === retries) {
        console.error('[bootstrap] Error al inicializar cuenta remota:', error);
        throw error;
      } else {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }
  }
}
