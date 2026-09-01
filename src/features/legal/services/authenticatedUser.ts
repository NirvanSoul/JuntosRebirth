import { authClient } from '@/lib/auth-client';

/**
 * Uuid de quien usa el móvil si hay una sesión.
 *
 * La identidad sale de la sesión de Better Auth, que es la que autentica todas
 * las llamadas a la API. Leerla de otra fuente abriría la puerta a firmar
 * filas con un uuid que el servidor no reconoce.
 *
 * No lanza: la navegación raíz impide llegar a las pantallas de datos sin una
 * sesión verificada, y este helper permite que las tareas de segundo plano se
 * retiren con seguridad si la sesión desaparece.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data } = await authClient.getSession();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}
