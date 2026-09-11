import { isExpiredSessionError } from '@/features/auth/services/expiredSession';
import { ApiError } from '@/services/api/client';

export type SyncFailureKind = 'expired' | 'offline' | 'recoverable';

/**
 * Clasifica un fallo de sincronización para decidir qué se le cuenta a la
 * persona: una sesión caducada ya cierra sesión por su cuenta; sin conexión
 * basta con avisar y reintentar al reconectar; el resto pide un reintento
 * explícito.
 */
export function classifySyncFailure(error: unknown): SyncFailureKind {
  if (isExpiredSessionError(error)) return 'expired';
  if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
    return 'offline';
  }
  return 'recoverable';
}
