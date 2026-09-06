import { prepareLocalCacheForSession } from '@/features/auth/services/prepareLocalCacheForSession';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';

jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/features/auth/services/prepareLocalCacheForSession');
jest.mock('@/features/profile/repositories/localProfileRepository');
jest.mock('@/features/profile/services/syncOwnCountry');
jest.mock('@/features/sync/services/bootstrapRemoteAccount');
jest.mock('@/features/sync/services/restoreRemoteAccount');
jest.mock('@/features/sync/services/syncCoupleSpaceData');

describe('initializeAuthenticatedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadSpaces as jest.Mock).mockResolvedValue({
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal' },
        { id: 'couple-space-1', name: 'Juntos', type: 'couple' },
      ],
    });
    (prepareLocalCacheForSession as jest.Mock).mockResolvedValue('kept');
    (getLocalProfile as jest.Mock).mockResolvedValue({ countryCode: null });
    (bootstrapRemoteAccount as jest.Mock).mockResolvedValue(undefined);
    (restoreRemoteAccountForCurrentSession as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('ejecuta bootstrap, sincroniza los espacios y restaura la cuenta', async () => {
    await initializeAuthenticatedSession();

    expect(prepareLocalCacheForSession).toHaveBeenCalledTimes(1);
    expect(bootstrapRemoteAccount).toHaveBeenCalled();
    expect(syncSpaceDataForCurrentSession).toHaveBeenCalledWith({
      spaceId: 'personal',
      includeLocalOnly: true,
    });
    expect(syncSpaceDataForCurrentSession).toHaveBeenCalledWith({
      spaceId: 'couple-space-1',
      includeLocalOnly: true,
    });
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalled();
  });

  it('sube también las filas creadas sin conexión, que nunca llegaron a la nube', async () => {
    // La caché sobrevive al inicio de sesión, así que sus filas `local_only`
    // son trabajo real de esta cuenta. Excluirlas las dejaría en el móvil para
    // siempre, que es justo lo que el modo sin conexión promete evitar.
    await initializeAuthenticatedSession();

    for (const call of (syncSpaceDataForCurrentSession as jest.Mock).mock
      .calls) {
      expect(call[0].includeLocalOnly).toBe(true);
    }
  });

  it('decide sobre la caché local antes de tocar el servicio remoto', async () => {
    // Si la caché fuera de otra cuenta, restaurar sobre ella mezclaría datos
    // de dos personas.
    const order: string[] = [];
    (prepareLocalCacheForSession as jest.Mock).mockImplementation(async () => {
      order.push('cache');
      return 'kept';
    });
    (bootstrapRemoteAccount as jest.Mock).mockImplementation(async () => {
      order.push('bootstrap');
    });
    (restoreRemoteAccountForCurrentSession as jest.Mock).mockImplementation(
      async () => {
        order.push('restore');
      },
    );

    await initializeAuthenticatedSession();

    expect(order.slice(0, 3)).toEqual(['cache', 'bootstrap', 'restore']);
  });

  it('publica el país elegido antes de restaurar el snapshot remoto', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue({ countryCode: 'ES' });
    (syncOwnCountry as jest.Mock).mockResolvedValue(true);

    await initializeAuthenticatedSession();

    expect(syncOwnCountry).toHaveBeenCalledWith('ES', {
      ensureBootstrap: false,
    });
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalled();
    const bootstrapCall = (bootstrapRemoteAccount as jest.Mock).mock
      .invocationCallOrder[0];
    const countryCall = (syncOwnCountry as jest.Mock).mock
      .invocationCallOrder[0];
    const restoreCall = (restoreRemoteAccountForCurrentSession as jest.Mock)
      .mock.invocationCallOrder[0];
    if (
      bootstrapCall === undefined ||
      countryCall === undefined ||
      restoreCall === undefined
    ) {
      throw new Error('Falta una llamada esperada en la inicialización');
    }
    expect(bootstrapCall).toBeLessThan(countryCall);
    expect(countryCall).toBeLessThan(restoreCall);
  });
});
