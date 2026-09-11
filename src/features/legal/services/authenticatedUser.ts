import { authClient } from '@/lib/auth-client';

/**
 * Uuid de quien usa el móvil si hay una sesión.
 *
 * La identidad sale de la sesión de Better Auth, que es la que autentica todas
 * las llamadas a la API. Leerla de otra fuente abriría la puerta a firmar
 * filas con un uuid que el servidor no reconoce.
 *
 * `authClient.getSession()` es una petición de red sin caché, así que un corte
 * la resuelve igual que una sesión ausente. Cuando eso pasa se lee la sesión
 * que `useSession()` mantiene en memoria: es la misma sesión verificada, no
 * otra fuente de identidad, y es la que ya decide si la app deja pasar a las
 * pantallas de datos. Sin esa caída, una conexión inestable convertía a una
 * persona conectada en anónima y detenía sus subidas.
 *
 * No lanza: la navegación raíz impide llegar a las pantallas de datos sin una
 * sesión verificada, y este helper permite que las tareas de segundo plano se
 * retiren con seguridad si la sesión desaparece.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data, error } = await authClient.getSession();
    // El servidor contestó: su respuesta manda, también cuando dice que ya no
    // queda sesión. Solo un 401 retira la caché, igual que hace Better Auth.
    if (!error) return data?.user?.id ?? null;
    if (error.status === 401) return null;
  } catch {
    // Transporte caído. No es una sesión ausente.
  }

  return readCachedSessionUserId();
}

/**
 * Lee sin red la sesión que Better Auth conserva en memoria.
 *
 * `$store.atoms` está tipado como `Record<string, WritableAtom<any>>`, así que
 * el contenido se comprueba en runtime antes de tratarlo como una identidad.
 */
function readCachedSessionUserId(): string | null {
  const cached: unknown = authClient.$store.atoms.session?.get();
  const data = readObjectProperty(cached, 'data');
  const user = readObjectProperty(data, 'user');
  const id = readObjectProperty(user, 'id');
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function readObjectProperty(source: unknown, key: string): unknown {
  if (typeof source !== 'object' || source === null) return undefined;
  return (source as Record<string, unknown>)[key];
}
