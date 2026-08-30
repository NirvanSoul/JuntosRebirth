import type { BetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';

export type AuthSessionState = {
  session: BetterAuthSession | null;
  userId: string | null;
  isReady: boolean;
};

/**
 * Se suscribe a los cambios de sesión de Better Auth y expone el estado
 * actual. `isReady` queda en `false` hasta que se resuelve la primera lectura
 * de `getSession()`, para no mostrar un parpadeo de "sin sesión" antes de
 * comprobar la sesión guardada en el dispositivo.
 */
export function useAuthSession(): AuthSessionState {
  const { session, isReady } = useBetterAuthSession();
  return { session, userId: session?.user.id ?? null, isReady };
}
