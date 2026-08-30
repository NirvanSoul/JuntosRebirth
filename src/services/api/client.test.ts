import { createApiClient } from '@/services/api/client';

function createResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  it('construye URLs sin dobles barras', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(createResponse({ spaces: [] }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetchImpl,
      getCookie: async () => 'session=private',
    });

    await client.get('/v1/spaces');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/v1/spaces',
      expect.objectContaining({ credentials: 'omit', method: 'GET' }),
    );
  });

  it('adjunta la cookie únicamente a llamadas privadas', async () => {
    const fetchImpl = jest
      .fn()
      .mockImplementation(async () => createResponse({ ok: true }));
    const getCookie = jest.fn(async () => 'session=private');
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl,
      getCookie,
    });

    await client.get('/v1/spaces');
    const privateRequest = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(privateRequest.headers).get('Cookie')).toBe(
      'session=private',
    );

    await client.get('/v1/rates/venezuela', { isPublic: true });
    const publicRequest = fetchImpl.mock.calls[1]?.[1] as RequestInit;
    expect(getCookie).toHaveBeenCalledTimes(1);
    expect(new Headers(publicRequest.headers).get('Cookie')).toBeNull();
  });

  it('no expone el mensaje técnico de un error API', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl: jest.fn().mockResolvedValue(
        createResponse(
          {
            error: { code: 'INVALID_INPUT', message: 'column users leaked' },
          },
          400,
        ),
      ),
      getCookie: async () => '',
    });

    await expect(client.get('/v1/spaces')).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Revisa los datos e inténtalo de nuevo.',
        status: 400,
      }),
    );
  });

  it('sube bytes con su propio Content-Type y sin serializarlos', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(createResponse({ data: { avatar: {} } }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl,
      getCookie: async () => 'session=private',
    });
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

    await client.putBytes('/v1/me/avatar', bytes, 'image/jpeg');

    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe('PUT');
    expect(new Headers(request.headers).get('Content-Type')).toBe('image/jpeg');
    // Ni JSON ni base64: los mismos bytes que se midieron en el dispositivo.
    expect(request.body).toBe(bytes);
    expect(new Headers(request.headers).get('Cookie')).toBe('session=private');
  });

  it('sigue enviando JSON en las peticiones que ya existían', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(createResponse({ ok: true }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl,
      getCookie: async () => 'session=private',
    });

    await client.post('/v1/spaces', { name: 'Casa' });

    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get('Content-Type')).toBe(
      'application/json',
    );
    expect(request.body).toBe(JSON.stringify({ name: 'Casa' }));
  });

  it('descarga bytes y trata el 404 como ausencia, no como fallo', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        createResponse({ error: { code: 'NOT_FOUND' } }, 404),
      );
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl,
      getCookie: async () => 'session=private',
    });

    await expect(client.getBytes('/v1/avatars/uuid-ana')).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    // Quien todavía no tiene foto no es un error que deba alertar a nadie.
    await expect(client.getBytes('/v1/avatars/uuid-bea')).resolves.toBeNull();
  });

  it('propaga el código de un rechazo de avatar para poder ramificar por él', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl: jest
        .fn()
        .mockResolvedValue(
          createResponse({ error: { code: 'AVATAR_TOO_LARGE' } }, 400),
        ),
      getCookie: async () => 'session=private',
    });

    await expect(
      client.putBytes('/v1/me/avatar', new Uint8Array([1]), 'image/jpeg'),
    ).rejects.toMatchObject({ code: 'AVATAR_TOO_LARGE', status: 400 });
  });
});
