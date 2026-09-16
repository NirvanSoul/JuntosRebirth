import type { SQLiteDatabase } from 'expo-sqlite';

import {
  replaceSpaceMemberProfiles,
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
});
