import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { ApiError } from '@/services/api/client';

/**
 * Un 401 del servicio remoto significa que la sesión ya no autoriza nada. La
 * navegación principal exige una sesión verificada (`PROJECT_RULES.md` §15),
 * así que dejarla en pie mientras cada sincronización falla deja a la vista la
 * caché de una cuenta que el servidor ya rechaza, y sin ninguna vía de
 * recuperación: solo errores repetidos en consola. Cerrar sesión devuelve al
 * login, que es donde el usuario puede repararlo.
 */
export function isExpiredSessionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/**
 * Cierra la sesión si el error es una sesión caducada. Devuelve si actuó, para
 * que quien llama pueda decidir si además muestra un mensaje.
 */
export async function endExpiredSession(error: unknown): Promise<boolean> {
  if (!isExpiredSessionError(error)) return false;

  // El cierre remoto puede fallar precisamente porque la sesión ya no vale;
  // eso no debe impedir que la app vuelva al login.
  await createJuntossAuthGateway()
    .signOut()
    .catch(() => undefined);
  return true;
}
