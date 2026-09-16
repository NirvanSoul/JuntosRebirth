import { prepareLocalCacheForSession } from '@/features/auth/services/prepareLocalCacheForSession';
import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { restoreOwnProfile } from '@/features/profile/services/restoreOwnProfile';
import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import { retryPendingDisplayNameSync } from '@/features/profile/services/syncOwnDisplayName';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';

jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/features/auth/services/prepareLocalCacheForSession');
jest.mock('@/features/profile/repositories/localProfileRepository');
jest.mock('@/features/profile/services/syncOwnAvatar');
jest.mock('@/features/profile/services/syncOwnCountry');
jest.mock('@/features/profile/services/syncOwnDisplayName');
jest.mock('@/features/profile/services/restoreOwnProfile');
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
    (restoreOwnProfile as jest.Mock).mockResolvedValue(null);
    (syncOwnAvatar as jest.Mock).mockResolvedValue(false);
    (retryPendingDisplayNameSync as jest.Mock).mockResolvedValue(false);
    (syncSpaceDataForCurrentSession as jest.Mock).mockResolvedValue({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 0,
    });
    (restoreRemoteAccountForCurrentSession as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('ejecuta bootstrap, sincroniza los espacios y restaura la cuenta', async () => {
    await initializeAuthenticatedSession();

    expect(prepareLocalCacheForSession).toHaveBeenCalledTimes(1);
    expect(bootstrapRemoteAccount).toHaveBeenCalled();
    expect(restoreOwnProfile).toHaveBeenCalled();
    expect(retryPendingDisplayNameSync).toHaveBeenCalled();
    expect(syncOwnAvatar).toHaveBeenCalled();
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

  it('evita un segundo snapshot cuando no hay cambios locales que subir', async () => {
    await initializeAuthenticatedSession();
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalledTimes(1);
  });

  it('restaura de nuevo cuando se subieron cambios', async () => {
    (syncSpaceDataForCurrentSession as jest.Mock).mockResolvedValueOnce({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 1,
    });
    await initializeAuthenticatedSession();
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalledTimes(2);
  });

  it('restaura de nuevo tras una subida incierta sin reintentar la escritura', async () => {
    const errorLog = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      (syncSpaceDataForCurrentSession as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed'),
      );
      await initializeAuthenticatedSession();
      expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalledTimes(2);
      expect(syncSpaceDataForCurrentSession).toHaveBeenCalledTimes(2);
    } finally {
      errorLog.mockRestore();
    }
  });

  it('no vuelve a publicar el país que acaba de confirmar el servidor', async () => {
    (restoreOwnProfile as jest.Mock).mockResolvedValue('VE');
    (getLocalProfile as jest.Mock).mockResolvedValue({ countryCode: 'VE' });
    await initializeAuthenticatedSession();
    expect(syncOwnCountry).not.toHaveBeenCalled();
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalledTimes(1);
  });

  it('reutiliza la inicialización que ya está en curso', async () => {
    let resolveBootstrap: (() => void) | undefined;
    (bootstrapRemoteAccount as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveBootstrap = resolve;
        }),
    );

    const first = initializeAuthenticatedSession();
    const second = initializeAuthenticatedSession();
    await new Promise(setImmediate);
    expect(bootstrapRemoteAccount).toHaveBeenCalledTimes(1);

    resolveBootstrap?.();
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });

  describe('onLocalCacheReady', () => {
    it('avisa de la caché conservada antes de la primera petición remota', async () => {
      const order: string[] = [];
      (bootstrapRemoteAccount as jest.Mock).mockImplementation(async () => {
        order.push('bootstrap');
      });

      await initializeAuthenticatedSession({
        onLocalCacheReady: (preparation) => order.push(`cache:${preparation}`),
      });

      expect(order[0]).toBe('cache:kept');
      expect(order).toContain('bootstrap');
    });

    it('avisa aunque el resto de la inicialización falle después', async () => {
      const onLocalCacheReady = jest.fn();
      (bootstrapRemoteAccount as jest.Mock).mockRejectedValue(
        new Error('sin red'),
      );

      await expect(
        initializeAuthenticatedSession({ onLocalCacheReady }),
      ).rejects.toThrow('sin red');

      expect(onLocalCacheReady).toHaveBeenCalledWith('kept');
    });

    it('propaga como rechazo único un fallo al decidir sobre la caché', async () => {
      const onLocalCacheReady = jest.fn();
      (prepareLocalCacheForSession as jest.Mock).mockRejectedValue(
        new Error('SQLite bloqueada'),
      );

      await expect(
        initializeAuthenticatedSession({ onLocalCacheReady }),
      ).rejects.toThrow('SQLite bloqueada');

      expect(onLocalCacheReady).not.toHaveBeenCalled();
      expect(bootstrapRemoteAccount).not.toHaveBeenCalled();
    });

    it('también avisa a quien se suma a una inicialización en curso', async () => {
      let resolveBootstrap: (() => void) | undefined;
      (bootstrapRemoteAccount as jest.Mock).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveBootstrap = resolve;
          }),
      );

      const first = initializeAuthenticatedSession();
      await new Promise(setImmediate);
      const onLocalCacheReady = jest.fn();
      const second = initializeAuthenticatedSession({ onLocalCacheReady });
      await new Promise(setImmediate);

      expect(onLocalCacheReady).toHaveBeenCalledWith('kept');
      resolveBootstrap?.();
      await Promise.all([first, second]);
    });
  });
});
