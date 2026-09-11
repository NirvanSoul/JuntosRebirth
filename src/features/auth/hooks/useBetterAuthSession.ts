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

  return {
    error,
    isReady: !isPending || data !== null,
    session: data ?? null,
  };
}
