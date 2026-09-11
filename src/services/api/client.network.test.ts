import { createApiClient } from '@/services/api/client';

describe('apiClient transport failures', () => {
  const lostConnection = new Error(
    'fetch failed: UnexpectedException: The network connection was lost. (at ExpoModulesCore/Promise.swift:56)',
  );

  it('normalizes a lost connection without retrying a write', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(lostConnection);
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl,
      getCookie: async () => '',
    });
    await expect(client.post('/v1/spaces', {})).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
      endpoint: '/v1/spaces',
      message:
        'Se interrumpió la conexión. Comprueba Internet e inténtalo de nuevo.',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('recognizes transport errors from the native bridge without an Error prototype', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue({ message: lostConnection.message });
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl,
      getCookie: async () => '',
    });
    await expect(
      client.patch('/v1/me/profile', { countryCode: 'VE' }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each(['json', 'arrayBuffer'] as const)(
    'normalizes a disconnect while reading %s',
    async (reader) => {
      const response = new Response('{}');
      jest.spyOn(response, reader).mockRejectedValue(lostConnection);
      const client = createApiClient({
        baseUrl: 'https://api.test',
        fetchImpl: jest.fn().mockResolvedValue(response),
        getCookie: async () => '',
      });
      const result =
        reader === 'json'
          ? client.get('/v1/sync/snapshot')
          : client.getBytes('/v1/avatars/user');
      await expect(result).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        status: 0,
      });
    },
  );

  it('does not disguise malformed JSON as a network failure', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: jest.fn().mockResolvedValue(new Response('not JSON')),
      getCookie: async () => '',
    });
    await expect(client.get('/v1/sync/snapshot')).rejects.toMatchObject({
      name: 'SyntaxError',
    });
  });
});
