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
 * sesión ausente. `isReady` solo pasa a `true` cuando `useSession()` termina.
 */
export function useBetterAuthSession(): BetterAuthSessionState {
  const { data, error, isPending } = authClient.useSession();

  return {
    error,
    isReady: !isPending,
    session: data ?? null,
  };
}
