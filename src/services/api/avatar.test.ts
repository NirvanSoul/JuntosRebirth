import {
  deleteAvatar,
  getAvatar,
  getAvatarUri,
  uploadAvatar,
} from '@/services/api/avatar';
import { ApiError } from '@/services/api/client';

const mockPutBytes = jest.fn();
const mockGetBytes = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: {
    putBytes: (...args: unknown[]) => mockPutBytes(...args),
    getBytes: (...args: unknown[]) => mockGetBytes(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('getAvatarUri', () => {
  it('apunta a la API y nunca a un almacenamiento externo', () => {
    const uri = getAvatarUri('uuid-ana', '2026-08-30T10:14:38.971Z');

    expect(uri.startsWith('/v1/avatars/uuid-ana')).toBe(true);
    // Ni bucket, ni dominio de R2, ni `avatarPath` concatenado a nada.
    expect(uri).not.toMatch(/r2|cloudflare|https?:\/\//i);
    expect(uri).not.toContain('avatar.jpg');
  });

  it('cambia de dirección cuando cambia avatarUpdatedAt', () => {
    // La clave remota es fija: sin el sello, la caché serviría la foto vieja.
    expect(getAvatarUri('uuid-ana', '2026-08-30T10:14:38.971Z')).not.toBe(
      getAvatarUri('uuid-ana', '2026-08-30T11:02:11.004Z'),
    );
  });

  it('escapa el sello para que no rompa la query', () => {
    expect(getAvatarUri('uuid-ana', '2026-08-30T10:14:38.971Z')).toBe(
      '/v1/avatars/uuid-ana?v=2026-08-30T10%3A14%3A38.971Z',
    );
  });

  it('omite la versión cuando todavía no hay sello', () => {
    expect(getAvatarUri('uuid-ana')).toBe('/v1/avatars/uuid-ana');
  });
});

describe('uploadAvatar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sube bytes con Content-Type image/jpeg, sin JSON ni base64', async () => {
    mockPutBytes.mockResolvedValue({
      data: {
        avatar: {
          avatarPath: 'uuid-ana/avatar.jpg',
          avatarUpdatedAt: '2026-08-30T10:14:38.971Z',
        },
      },
    });
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);

    const avatar = await uploadAvatar(bytes);

    expect(mockPutBytes).toHaveBeenCalledWith(
      '/v1/me/avatar',
      bytes,
      'image/jpeg',
    );
    expect(avatar).toEqual({
      avatarPath: 'uuid-ana/avatar.jpg',
      avatarUpdatedAt: '2026-08-30T10:14:38.971Z',
    });
  });

  it('propaga el código del rechazo para que la interfaz ramifique por él', async () => {
    mockPutBytes.mockRejectedValue(
      new ApiError({ status: 400, code: 'AVATAR_TOO_LARGE', message: 'x' }),
    );

    await expect(uploadAvatar(new Uint8Array([1]))).rejects.toMatchObject({
      code: 'AVATAR_TOO_LARGE',
    });
  });
});

describe('getAvatar y deleteAvatar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('descarga por la ruta versionada de la API', async () => {
    mockGetBytes.mockResolvedValue(new Uint8Array([1, 2]));

    await getAvatar('uuid-bea', '2026-08-30T10:14:38.971Z');

    expect(mockGetBytes).toHaveBeenCalledWith(
      '/v1/avatars/uuid-bea?v=2026-08-30T10%3A14%3A38.971Z',
    );
  });

  it('borra contra el endpoint del contrato', async () => {
    await deleteAvatar();
    expect(mockDelete).toHaveBeenCalledWith('/v1/me/avatar');
  });
});
