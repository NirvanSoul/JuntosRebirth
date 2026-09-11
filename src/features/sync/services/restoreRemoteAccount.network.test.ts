import { restoreRemoteAccountForCurrentSession } from './restoreRemoteAccount';

const mockGetSession = jest.fn();
const mockCachedSession = jest.fn();
const mockSnapshot = jest.fn();
const mockRun = jest.fn();

jest.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: () => mockGetSession(),
    $store: { atoms: { session: { get: () => mockCachedSession() } } },
  },
}));
jest.mock('@/features/sync/gateways/juntossRemoteAccountGateway', () => ({
  fetchRemoteAccountSnapshot: () => mockSnapshot(),
}));
jest.mock('@/features/import/gateways/juntossImportReviewGateway', () => ({
  fetchRemoteImportReviews: async () => [],
}));
jest.mock('./restoreRemoteImportReviews', () => ({
  restoreRemoteImportReviews: jest.fn(),
}));
jest.mock('@/features/spaces/repositories/localSpaceRepository', () => ({
  loadSpaces: async () => ({ spaces: [], activeSpaceId: null }),
  saveSpaces: jest.fn(),
  updateSpaces: jest.fn(async (mutate: (stored: unknown) => unknown) =>
    mutate({ spaces: [], activeSpaceId: null }),
  ),
}));
jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: async () => {
    const database = {
      getAllAsync: async () => [],
      getFirstAsync: async () => null,
      runAsync: mockRun,
      withExclusiveTransactionAsync: async (
        callback: (tx: object) => Promise<void>,
      ) => callback(database),
    };
    return database;
  },
}));

describe('restoration with interrupted session lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCachedSession.mockReturnValue({
      data: { user: { id: 'verified-user', emailVerified: true } },
    });
    mockSnapshot.mockResolvedValue({
      activeFinancialContextId: null,
      spaces: [
        {
          remoteId: 'personal-remote',
          type: 'personal',
          name: 'Personal',
          currency: 'USD',
        },
      ],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });
  });

  it('continues to the authenticated snapshot when the session transport drops', async () => {
    mockGetSession.mockRejectedValue(
      new Error('fetch failed: The network connection was lost.'),
    );
    await expect(
      restoreRemoteAccountForCurrentSession(),
    ).resolves.toMatchObject({ spaces: [{ id: 'personal-remote' }] });
    expect(mockSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not restore from a cached identity after an explicit 401', async () => {
    mockGetSession.mockResolvedValue({ data: null, error: { status: 401 } });
    await expect(restoreRemoteAccountForCurrentSession()).rejects.toThrow(
      'Debes iniciar sesión',
    );
    expect(mockSnapshot).not.toHaveBeenCalled();
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('does not write local data when the snapshot itself fails', async () => {
    mockGetSession.mockRejectedValue(new Error('Network request failed'));
    mockSnapshot.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(restoreRemoteAccountForCurrentSession()).rejects.toThrow(
      'Network request failed',
    );
    expect(mockRun).not.toHaveBeenCalled();
  });
});
