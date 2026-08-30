import { apiClient } from '@/services/api/juntossApiClient';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('@/features/legal/services/authenticatedUser');

describe('bootstrapRemoteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAuthenticatedUserId).mockResolvedValue('user-ana');
  });

  it('llama a POST /v1/bootstrap con la zona horaria del contrato remoto', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ status: 200 });

    await bootstrapRemoteAccount();

    expect(apiClient.post).toHaveBeenCalledWith('/v1/bootstrap', {
      timezone: expect.any(String),
    });
  });

  it('propaga el error si el bootstrap falla tras los reintentos', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(bootstrapRemoteAccount(0)).rejects.toThrow('Network error');
  });

  it('comparte el bootstrap que ya está en curso', async () => {
    let resolveRequest: (() => void) | undefined;
    (apiClient.post as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const first = bootstrapRemoteAccount();
    const second = bootstrapRemoteAccount();

    await new Promise(setImmediate);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    resolveRequest?.();
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });
});
