import {
  completeLocalGuestMigration,
  failLocalGuestMigration,
  prepareLocalGuestMigration,
} from '@/features/sync/repositories/localGuestMigrationRepository';
import { migrateAuthenticatedGuestData } from '@/features/sync/services/migrateAuthenticatedGuestData';
import type { GuestMigrationPayload } from '@/features/sync/types';

jest.mock('@/features/sync/repositories/localGuestMigrationRepository');

const payload: GuestMigrationPayload = {
  batchId: 'batch-id',
  installationId: 'installation-id',
  userId: 'user-id',
  spaces: [
    { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
  ],
  categories: [],
  moneyAccounts: [],
  recurringSeries: [],
  transactions: [],
};

describe('migrateAuthenticatedGuestData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prepareLocalGuestMigration).mockResolvedValue(payload);
    jest.mocked(completeLocalGuestMigration).mockResolvedValue();
    jest.mocked(failLocalGuestMigration).mockResolvedValue();
  });

  it('solo marca el lote como sincronizado tras confirmar todos los conteos', async () => {
    const gateway = {
      migrateGuestData: jest.fn(async () => ({
        batchId: 'batch-id',
        spaceCount: 1,
        categoryCount: 0,
        seriesCount: 0,
        transactionCount: 0,
      })),
    };

    await migrateAuthenticatedGuestData({
      userId: 'user-id',
      spaces: payload.spaces,
      confirmOwnership: true,
      gateway,
    });

    expect(completeLocalGuestMigration).toHaveBeenCalledWith(payload);
    expect(failLocalGuestMigration).not.toHaveBeenCalled();
  });

  it('conserva el lote para reintento si la nube falla o confirma menos filas', async () => {
    const gateway = {
      migrateGuestData: jest.fn(async () => ({
        batchId: 'batch-id',
        spaceCount: 0,
        categoryCount: 0,
        seriesCount: 0,
        transactionCount: 0,
      })),
    };

    await expect(
      migrateAuthenticatedGuestData({
        userId: 'user-id',
        spaces: payload.spaces,
        confirmOwnership: true,
        gateway,
      }),
    ).rejects.toThrow('no confirmó el lote local completo');
    expect(failLocalGuestMigration).toHaveBeenCalledWith(payload);
    expect(completeLocalGuestMigration).not.toHaveBeenCalled();
  });
});
