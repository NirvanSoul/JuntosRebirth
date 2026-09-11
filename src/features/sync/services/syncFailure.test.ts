import { classifySyncFailure } from '@/features/sync/services/syncFailure';
import { ApiError } from '@/services/api/client';

describe('classifySyncFailure', () => {
  it('reconoce la sesión caducada', () => {
    expect(
      classifySyncFailure(
        new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'x' }),
      ),
    ).toBe('expired');
  });

  it('reconoce la falta de conexión normalizada por el cliente HTTP', () => {
    expect(
      classifySyncFailure(
        new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
      ),
    ).toBe('offline');
  });

  it('trata cualquier otro fallo como recuperable con reintento explícito', () => {
    expect(
      classifySyncFailure(
        new ApiError({ status: 503, code: 'UNAVAILABLE', message: 'x' }),
      ),
    ).toBe('recoverable');
    expect(classifySyncFailure(new Error('SQLite bloqueada'))).toBe(
      'recoverable',
    );
  });
});
