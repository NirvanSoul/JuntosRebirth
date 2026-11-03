export type LocalCacheIsolationReason =
  /** No se pudo cerrar o borrar la caché de otra cuenta. */
  | 'discard_failed'
  /** No se pudo apartar una caché de propietario desconocido. */
  | 'quarantine_failed'
  /** No hay una sesión con la que atribuir la caché. */
  | 'no_session'
  /** La caché declara otro propietario que la sesión que intenta usarla. */
  | 'owner_mismatch';

/**
 * La caché local no puede demostrarse de la sesión actual, o no se pudo
 * apartar la de otra cuenta. Mientras dure, la app no muestra, asocia ni sube
 * esa caché: ofrece reintentar (`PROJECT_RULES.md` §15).
 */
export class LocalCacheIsolationError extends Error {
  readonly reason: LocalCacheIsolationReason;

  constructor(
    reason: LocalCacheIsolationReason,
    options?: { cause?: unknown },
  ) {
    super(`La caché local no está aislada de forma segura (${reason})`);
    this.name = 'LocalCacheIsolationError';
    this.reason = reason;
    if (options && 'cause' in options) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isLocalCacheIsolationError(
  error: unknown,
): error is LocalCacheIsolationError {
  return error instanceof LocalCacheIsolationError;
}
