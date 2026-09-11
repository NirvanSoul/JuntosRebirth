import { authClient } from '@/lib/auth-client';

/**
 * Lee primero la sesión verificada y vigente que Better Auth ya mantiene para
 * la navegación. No crea otra caché ni prolonga su caducidad. Los endpoints
 * privados siguen validando la cookie en el servidor en cada petición.
 * Si esa lectura no es utilizable, consulta al proveedor y conserva la
 * recuperación de identidad ante un fallo de transporte.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const cachedUserId = readVerifiedCachedSessionUserId();
  if (cachedUserId) return cachedUserId;

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
 * Solo acelera una sesión verificada y aún no caducada.
 *
 * Vale tanto la respuesta ya resuelta de `/get-session` como la copia que el
 * cliente Expo hidrata desde SecureStore mientras esa petición sigue en vuelo:
 * es la misma sesión verificada de la visita anterior, con su caducidad, y
 * cada endpoint privado sigue validando la cookie en el servidor. Esperar a
 * que termine la petición devolvería la red al arranque en frío.
 */
function readVerifiedCachedSessionUserId(): string | null {
  const cached: unknown = authClient.$store?.atoms.session?.get();
  if (readObjectProperty(cached, 'error')) return null;

  const data = readObjectProperty(cached, 'data');
  const user = readObjectProperty(data, 'user');
  if (readObjectProperty(user, 'emailVerified') !== true) return null;
  const session = readObjectProperty(data, 'session');
  const expiresAt = readObjectProperty(session, 'expiresAt');
  const expiration =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : typeof expiresAt === 'string'
        ? Date.parse(expiresAt)
        : NaN;
  if (!Number.isFinite(expiration) || expiration <= Date.now()) return null;
  const id = readObjectProperty(user, 'id');
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Lee sin red la sesión que Better Auth conserva en memoria.
 *
 * `$store.atoms` está tipado como `Record<string, WritableAtom<any>>`, así que
 * el contenido se comprueba en runtime antes de tratarlo como una identidad.
 */
function readCachedSessionUserId(): string | null {
  const cached: unknown = authClient.$store?.atoms.session?.get();
  const data = readObjectProperty(cached, 'data');
  const user = readObjectProperty(data, 'user');
  const id = readObjectProperty(user, 'id');
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function readObjectProperty(source: unknown, key: string): unknown {
  if (typeof source !== 'object' || source === null) return undefined;
  return (source as Record<string, unknown>)[key];
}
