import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabaseEnvironment } from '@/app/config/environment';
import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';

export type AuthSessionState = {
  session: Session | null;
  userId: string | null;
  isReady: boolean;
};

/**
 * Se suscribe a los cambios de sesión de Supabase Auth y expone el estado
 * actual. `isReady` queda en `false` hasta que se resuelve la primera lectura
 * de `getSession()`, para no mostrar un parpadeo de "sin sesión" antes de
 * comprobar la sesión guardada en el dispositivo.
 */
export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseEnvironment) {
      setReady(true);
      return;
    }

    let isMounted = true;
    const gateway = createSupabaseAuthGateway();

    void gateway
      .getSession()
      .then((initialSession) => {
        if (isMounted) setSession(initialSession);
      })
      .catch(() => {
        // Sin sesión recuperable: se trata como invitado, no como error fatal.
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    const subscription = gateway.onAuthStateChange((nextSession) => {
      if (isMounted) setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    userId: session?.user.id ?? null,
    isReady,
  };
}
