import { useMemo, useState } from 'react';

import { authClient } from '@/lib/auth-client';
import {
  useDemoSession,
  type DemoSession,
} from '@/state/demoSession/demoSessionStore';

export type BetterAuthSession = NonNullable<
  ReturnType<typeof authClient.useSession>['data']
>;

export type BetterAuthSessionState = {
  error: Error | null;
  isReady: boolean;
  session: BetterAuthSession | null;
};

/**
 * Expone la sesión de Better Auth sin convertir su carga inicial en una
 * sesión ausente.
 *
 * `isReady` pasa a `true` cuando `useSession()` termina o, antes, cuando el
 * cliente Expo ya hidrató `data` con la sesión que guardó en SecureStore en la
 * última respuesta de `/get-session`. Esa copia es la misma sesión verificada
 * que autorizó la anterior visita, así que abrir con ella no espera a la red:
 * la comprobación remota sigue en curso y, si el servidor la niega, `data`
 * vuelve a `null` y la navegación regresa al acceso.
 */
export function useBetterAuthSession(): BetterAuthSessionState {
  const { data, error, isPending } = authClient.useSession();
  const { demoSession, isReady: isDemoReady } = useDemoSession();
  const demoAuthSession = useMemo(
    () => (demoSession ? toDemoAuthSession(demoSession) : null),
    [demoSession],
  );
  const isCurrentSessionReady = !isPending || data !== null;
  const [hasResolvedInitialSession, setHasResolvedInitialSession] = useState(
    isCurrentSessionReady,
  );

  // Una vez resuelta, la lectura inicial no vuelve al estado de arranque.
  if (isCurrentSessionReady && !hasResolvedInitialSession) {
    setHasResolvedInitialSession(true);
  }

  // El usuario demo de desarrollo sustituye a la sesión real mientras exista.
  // Hasta saber si hay uno guardado no se decide el destino de la navegación.
  if (demoAuthSession) {
    return { error: null, isReady: true, session: demoAuthSession };
  }

  return {
    error,
    // Better Auth marca una sesión anónima como pendiente cada vez que
    // recupera el foco. En iOS, Face ID provoca una transición inactive/active
    // al autorizar el autocompletado. La espera solo debe bloquear el arranque:
    // desmontar Acceso en los refrescos posteriores borra el formulario.
    isReady:
      isDemoReady && (isCurrentSessionReady || hasResolvedInitialSession),
    session: data ?? null,
  };
}

/**
 * Sesión verificada sintética del usuario demo. No tiene cookie ni token
 * válido: `juntossApiClient` bloquea cualquier petición privada mientras está
 * activa, así que nunca llega al servidor.
 */
function toDemoAuthSession(demoSession: DemoSession): BetterAuthSession {
  const createdAt = new Date(demoSession.createdAt);
  return {
    user: {
      id: demoSession.userId,
      email: demoSession.email,
      emailVerified: true,
      name: demoSession.displayName,
      image: null,
      createdAt,
      updatedAt: createdAt,
    },
    session: {
      id: `${demoSession.userId}-session`,
      userId: demoSession.userId,
      token: '',
      // Una sesión local que no caduca mientras no se elimine el demo.
      expiresAt: new Date('2100-01-01T00:00:00.000Z'),
      createdAt,
      updatedAt: createdAt,
      ipAddress: null,
      userAgent: null,
    },
  };
}
