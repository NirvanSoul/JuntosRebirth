import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();
const mockUploadOwnAvatar = jest.fn();
const mockGetLocalAvatarUpload = jest.fn();
const mockMarkAvatarUploadResult = jest.fn();
const mockUpdateEq = jest.fn(async () => ({ error: null }));
const mockFileBytes = jest.fn(async () => new Uint8Array([1, 2, 3]));
let mockFileExists = true;

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/features/profile/gateways/supabaseAvatarStorageGateway', () => ({
  buildAvatarPath: (userId: string) => `${userId}/avatar.jpg`,
  uploadOwnAvatar: (...args: unknown[]) => mockUploadOwnAvatar(...args),
}));

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalAvatarUpload: () => mockGetLocalAvatarUpload(),
  markAvatarUploadResult: (...args: unknown[]) =>
    mockMarkAvatarUploadResult(...args),
}));

jest.mock('@/lib/supabase/supabaseClient', () => ({
  getConfiguredSupabaseClient: () => ({
    from: () => ({ update: () => ({ eq: mockUpdateEq }) }),
  }),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    get exists() {
      return mockFileExists;
    }
    bytes() {
      return mockFileBytes();
    }
  },
}));

describe('syncOwnAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists = true;
    mockGetAuthenticatedUserId.mockResolvedValue('uuid-ana');
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'pending',
    });
    mockUploadOwnAvatar.mockResolvedValue('uuid-ana/avatar.jpg');
  });

  it('sube la foto pendiente y la marca como sincronizada', async () => {
    await expect(syncOwnAvatar()).resolves.toBe(true);

    expect(mockUploadOwnAvatar).toHaveBeenCalledWith(
      'uuid-ana',
      new Uint8Array([1, 2, 3]),
    );
    expect(mockMarkAvatarUploadResult).toHaveBeenCalledWith(
      'file:///avatar.jpg',
      'synced',
      'uuid-ana/avatar.jpg',
    );
  });

  it('no sube nada en modo invitado', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockUploadOwnAvatar).not.toHaveBeenCalled();
  });

  it('no reintenta una foto ya sincronizada', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'synced',
    });

    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockUploadOwnAvatar).not.toHaveBeenCalled();
  });

  it('reintenta una subida que falló antes', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'failed',
    });

    await expect(syncOwnAvatar()).resolves.toBe(true);
    expect(mockUploadOwnAvatar).toHaveBeenCalled();
  });

  it('deja la foto como fallida sin lanzar cuando la subida revienta', async () => {
    mockUploadOwnAvatar.mockRejectedValue(new Error('sin red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // No lanzar es el requisito: se llama desde un efecto sin await.
    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockMarkAvatarUploadResult).toHaveBeenCalledWith(
      'file:///avatar.jpg',
      'failed',
      null,
    );
  });

  it('no publica la ruta si el archivo local ya no existe', async () => {
    mockFileExists = false;

    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockUploadOwnAvatar).not.toHaveBeenCalled();
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });
});
