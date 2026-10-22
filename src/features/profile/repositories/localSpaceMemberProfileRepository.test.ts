import type { SQLiteDatabase } from 'expo-sqlite';

import {
  replaceSpaceMemberProfiles,
  saveSpaceMemberAvatarCache,
  subscribeToSpaceMemberProfiles,
} from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import type { SpaceMemberProfile } from '@/features/profile/types';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

describe('localSpaceMemberProfileRepository', () => {
  const transaction = {
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
  };
  const database = {
    getAllAsync: jest.fn(async (): Promise<unknown[]> => []),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    withExclusiveTransactionAsync: jest.fn(
      async (work: (database: typeof transaction) => Promise<void>) => {
        await work(transaction);
      },
    ),
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('avisa a los consumidores del espacio después de reemplazar el censo', async () => {
    const subscriber = jest.fn();
    const unsubscribe = subscribeToSpaceMemberProfiles('couple-1', subscriber);
    const profiles: SpaceMemberProfile[] = [
      {
        userId: 'user-1',
        displayName: 'Ana',
        avatarPath: null,
        avatarUpdatedAt: null,
        avatarUri: null,
        defaultCurrency: null,
      },
    ];

    await replaceSpaceMemberProfiles('couple-1', profiles);

    expect(subscriber).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('no reescribe ni avisa si el censo no cambió', async () => {
    jest.mocked(database.getAllAsync).mockResolvedValueOnce([
      {
        user_id: 'user-1',
        display_name: 'Ana',
        avatar_path: null,
        avatar_updated_at: null,
        avatar_cached_uri: null,
        default_currency: null,
      },
    ]);
    const subscriber = jest.fn();
    const unsubscribe = subscribeToSpaceMemberProfiles('couple-1', subscriber);

    await replaceSpaceMemberProfiles('couple-1', [
      {
        userId: 'user-1',
        displayName: 'Ana',
        avatarPath: null,
        avatarUpdatedAt: null,
        avatarUri: null,
        defaultCurrency: null,
      },
    ]);

    expect(database.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('no avisa si la foto cacheada ya era la misma', async () => {
    jest
      .mocked(database.runAsync)
      .mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 });
    const subscriber = jest.fn();
    const unsubscribe = subscribeToSpaceMemberProfiles('couple-1', subscriber);

    await saveSpaceMemberAvatarCache('couple-1', 'user-1', 'file:///ana.jpg');

    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });
});
