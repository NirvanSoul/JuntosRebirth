import {
  endExpiredSession,
  isExpiredSessionError,
} from '@/features/auth/services/expiredSession';
import { ApiError } from '@/services/api/client';

const mockSignOut = jest.fn(async () => undefined);

jest.mock('@/features/auth/gateways/juntossAuthGateway', () => ({
  createJuntossAuthGateway: () => ({ signOut: mockSignOut }),
}));

function apiError(status: number): ApiError {
  return new ApiError({ status, code: 'unauthorized', message: 'caducó' });
}

describe('expiredSession', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('reconoce un 401 del servicio remoto', () => {
    expect(isExpiredSessionError(apiError(401))).toBe(true);
  });

  it('no confunde otros fallos con una sesión caducada', () => {
    expect(isExpiredSessionError(apiError(409))).toBe(false);
    expect(isExpiredSessionError(new Error('sin red'))).toBe(false);
  });

  it('cierra la sesión ante un 401 para devolver al login', async () => {
    await expect(endExpiredSession(apiError(401))).resolves.toBe(true);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('deja la sesión en pie ante un error que no la invalida', async () => {
    await expect(endExpiredSession(new Error('sin red'))).resolves.toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('vuelve al login aunque el cierre remoto falle', async () => {
    // El cierre puede fallar justamente porque la sesión ya no vale.
    mockSignOut.mockRejectedValueOnce(new Error('401'));

    await expect(endExpiredSession(apiError(401))).resolves.toBe(true);
  });
});
