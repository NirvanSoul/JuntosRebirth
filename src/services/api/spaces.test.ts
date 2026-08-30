import { listRemoteSpaces } from '@/services/api/spaces';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn() },
}));

describe('listRemoteSpaces', () => {
  it('lee los espacios dentro de data', async () => {
    const spaces = [
      {
        activatedAt: null,
        createdAt: '2026-08-28T10:00:00.000Z',
        currency: 'EUR',
        id: 'space-1',
        name: 'Personal',
        role: 'owner',
        timezone: 'Europe/Madrid',
        type: 'personal' as const,
      },
    ];
    jest.mocked(apiClient.get).mockResolvedValue({ data: { spaces } });

    await expect(listRemoteSpaces()).resolves.toEqual(spaces);
    expect(apiClient.get).toHaveBeenCalledWith('/v1/spaces');
  });
});
