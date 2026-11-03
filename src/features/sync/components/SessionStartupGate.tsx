import type { ReactNode } from 'react';

import { LoadingState } from '@/components/feedback/LoadingState/LoadingState';
import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { LocalCacheBlockedState } from '@/features/sync/components/LocalCacheBlockedState';

type SessionStartupGateProps = {
  children: ReactNode;
  /** El catálogo de espacios ya está cargado. */
  isReady: boolean;
  startup: {
    isFinanceReady: boolean;
    isLocalCacheBlocked: boolean;
    retryLocalCache: () => void;
  };
};

// Solo cierra la sesión: la caché bloqueada no se puede borrar con seguridad
// (o no se debe, si es de propietario desconocido). La próxima sesión vuelve
// a intentar aislarla antes de abrirla.
const signOutKeepingLocalCache = () => createJuntossAuthGateway().signOut();

/**
 * Decide qué ve la persona mientras se abre la sesión: la carga, la
 * navegación principal o, si la caché no se pudo aislar, un estado bloqueado
 * con reintento que no monta nada que pudiera leer esa caché.
 */
export function SessionStartupGate({
  children,
  isReady,
  startup,
}: SessionStartupGateProps) {
  if (startup.isLocalCacheBlocked) {
    return (
      <LocalCacheBlockedState
        onRetry={startup.retryLocalCache}
        onSignOut={signOutKeepingLocalCache}
      />
    );
  }
  return (
    <LoadingState
      loading={!isReady || !startup.isFinanceReady}
      testID="spaces-loading"
    >
      {children}
    </LoadingState>
  );
}
