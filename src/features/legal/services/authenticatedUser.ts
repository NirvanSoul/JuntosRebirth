import { authClient } from '@/lib/auth-client';

/**
 * Uuid de quien usa el móvil, o `null` en modo invitado.
 *
 * La identidad sale de la sesión de Better Auth, que es la que autentica todas
 * las llamadas a la API. Leerla de otra fuente abriría la puerta a firmar
 * filas con un uuid que el servidor no reconoce.
 *
 * No lanza: quedarse sin sesión es un estado normal —invitado, o sesión
 * caducada— y quien pregunta solo necesita saber si hay alguien detrás.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data } = await authClient.getSession();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}
