import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

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
  const isCurrentSessionReady = !isPending || data !== null;
  const [hasResolvedInitialSession, setHasResolvedInitialSession] = useState(
    isCurrentSessionReady,
  );

  // Una vez resuelta, la lectura inicial no vuelve al estado de arranque.
  if (isCurrentSessionReady && !hasResolvedInitialSession) {
    setHasResolvedInitialSession(true);
  }

  return {
    error,
    // Better Auth marca una sesión anónima como pendiente cada vez que
    // recupera el foco. En iOS, Face ID provoca una transición inactive/active
    // al autorizar el autocompletado. La espera solo debe bloquear el arranque:
    // desmontar Acceso en los refrescos posteriores borra el formulario.
    isReady: isCurrentSessionReady || hasResolvedInitialSession,
    session: data ?? null,
  };
}
