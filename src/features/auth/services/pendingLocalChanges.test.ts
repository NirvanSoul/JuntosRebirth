import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/juntossCoupleSpaceSyncGateway';
import { claimLocalCacheOwnership } from '@/features/sync/repositories/localSyncAccountRepository';
import {
  getLocalDatabase,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabase';
import { ApiError } from '@/services/api/client';
import { createNodeSqliteDatabase } from '@/test/nodeSqliteDatabase';

import {
  countDeviceOnlyData,
  countPendingLocalChanges,
  uploadPendingLocalChanges,
} from './pendingLocalChanges';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));
jest.mock('@/lib/storage/localDatabase', () => ({
  ...jest.requireActual('@/lib/storage/localDatabase'),
  getLocalDatabase: jest.fn(),
}));
jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  loadSpaces: jest.fn(),
}));
jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(async () => 'user-a'),
}));
jest.mock('@/features/sync/gateways/juntossCoupleSpaceSyncGateway', () => ({
  syncCoupleSpaceRemotely: jest.fn(),
}));
jest.mock('@/features/profile/services/syncOwnAvatar', () => ({
  syncOwnAvatar: jest.fn(async () => false),
}));
jest.mock('@/features/profile/services/syncOwnDisplayName', () => ({
  retryPendingDisplayNameSync: jest.fn(async () => false),
}));

const remoteAccepted = {
  categoryCount: 1,
  moneyAccountCount: 0,
  recurringSeriesCount: 0,
  transactionCount: 1,
};

describe('cambios pendientes al cerrar sesión', () => {
  let database: ReturnType<typeof createNodeSqliteDatabase>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-a');
    (loadSpaces as jest.Mock).mockResolvedValue({
      spaces: [{ id: 'personal', currency: 'EUR' }],
      activeSpaceId: 'personal',
    });
    await claimLocalCacheOwnership(database, 'user-a');
    await database.runAsync(
      `INSERT INTO categories (
         id, space_id, name, icon, color_token, is_default, created_by,
         sync_status, is_archived, created_at, updated_at
       ) VALUES ('cat-1', 'personal', 'Casa', 'house', 'violet', 0, 'user-a',
                 'pending', 0, '2026-01-01', '2026-01-01')`,
    );
    await database.runAsync(
      `INSERT INTO transactions (
         id, space_id, category_id, created_by, type, amount_minor, currency,
         title, occurred_on, recurrence, sync_status, is_archived, created_at,
         updated_at
       ) VALUES ('tx-1', 'personal', 'cat-1', 'user-a', 'expense', 1200, 'EUR',
                 'Pan', '2026-01-02', 'once', 'local_only', 0, '2026-01-02',
                 '2026-01-02')`,
    );
  });

  afterEach(() => {
    database.close();
    jest.restoreAllMocks();
  });

  it('cuenta los cambios de cualquier tipo que no ha confirmado el servidor', async () => {
    await database.runAsync(
      `INSERT INTO local_profile (singleton_id, display_name,
         display_name_sync_status) VALUES (1, 'Ana', 'pending')`,
    );

    await expect(countPendingLocalChanges()).resolves.toBe(3);
  });

  it('sube los pendientes y no queda nada que perder', async () => {
    (syncCoupleSpaceRemotely as jest.Mock).mockResolvedValue(remoteAccepted);

    await expect(uploadPendingLocalChanges()).resolves.toBe(0);
  });

  it.each([
    [
      'sin red',
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'sin red' }),
    ],
    [
      'rechazado por el servidor',
      new ApiError({ status: 400, code: 'INVALID_SYNC_PAYLOAD', message: 'x' }),
    ],
  ])(
    'si la subida falla (%s) conserva los pendientes y reintentar no duplica',
    async (_label, failure) => {
      (syncCoupleSpaceRemotely as jest.Mock)
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce(remoteAccepted);

      await expect(uploadPendingLocalChanges()).resolves.toBe(2);
      await expect(uploadPendingLocalChanges()).resolves.toBe(0);
      // Un tercer intento ya no tiene nada que enviar.
      await expect(uploadPendingLocalChanges()).resolves.toBe(0);

      expect(syncCoupleSpaceRemotely).toHaveBeenCalledTimes(2);
      const [first, second] = (syncCoupleSpaceRemotely as jest.Mock).mock.calls;
      // El reintento repite el mismo movimiento con la misma clave local; el
      // servidor lo reconoce por `installationId` e id en vez de crear otro.
      expect(second[0].transactions).toEqual(first[0].transactions);
      expect(second[0].installationId).toBe(first[0].installationId);
    },
  );

  it('cuenta aparte lo que no tiene subida: importaciones sin terminar y recordatorios', async () => {
    const now = '2026-01-03T00:00:00.000Z';
    const batches: readonly [string, string][] = [
      ['lote-en-revision', 'needs_review'],
      ['lote-importado', 'imported'],
      ['lote-cancelado', 'cancelled'],
    ];
    for (const [id, status] of batches) {
      await database.runAsync(
        `INSERT INTO import_batches (id, space_id, source_type, status,
           created_at, updated_at) VALUES (?, 'personal', 'csv', ?, ?, ?)`,
        id,
        status,
        now,
        now,
      );
    }
    await database.runAsync(
      `INSERT INTO transaction_notification_rules (id, space_id,
         transaction_type, times, created_at, updated_at)
       VALUES ('regla-1', 'personal', 'expense', '["09:00"]', ?, ?)`,
      now,
      now,
    );

    await expect(countDeviceOnlyData()).resolves.toEqual({
      importBatches: 1,
      notificationRules: 1,
    });
    // No inflan el recuento de lo que una subida podría salvar.
    await expect(countPendingLocalChanges()).resolves.toBe(2);
  });
});
