/**
 * Error seguro para interfaz que conserva el código estable devuelto por la
 * API sin exponer su mensaje interno.
 */
export class AuthApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
  }
}

/** Añade el código técnico al mensaje visible para facilitar el diagnóstico. */
export function getAuthErrorDisplayMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof AuthApiError) {
    return `${error.message}\nCódigo: ${error.code}`;
  }
  return error instanceof Error ? error.message : fallback;
}
