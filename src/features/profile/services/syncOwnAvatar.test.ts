import {
  restoreOwnAvatar,
  syncOwnAvatar,
} from '@/features/profile/services/syncOwnAvatar';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();
const mockUploadAvatar = jest.fn();
const mockGetAvatar = jest.fn();
const mockGetLocalAvatarUpload = jest.fn();
const mockMarkAvatarUploadResult = jest.fn();
const mockSaveOwnRemoteAvatar = jest.fn();
const mockSaveDownloadedOwnAvatar = jest.fn();
const mockReadAvatarBytes = jest.fn(
  async (_uri: string) => new Uint8Array([1, 2, 3]),
);
const mockStoreOwnAvatarBytes = jest.fn(
  (_bytes: Uint8Array) => 'file:///document/avatars/profile-avatar.jpg',
);
let mockFileExists = true;

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/services/api/avatar', () => ({
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
  getAvatar: (...args: unknown[]) => mockGetAvatar(...args),
}));

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalAvatarUpload: () => mockGetLocalAvatarUpload(),
  markAvatarUploadResult: (...args: unknown[]) =>
    mockMarkAvatarUploadResult(...args),
  saveOwnRemoteAvatar: (...args: unknown[]) => mockSaveOwnRemoteAvatar(...args),
  saveDownloadedOwnAvatar: (...args: unknown[]) =>
    mockSaveDownloadedOwnAvatar(...args),
}));

jest.mock('@/features/profile/services/avatarImageService', () => ({
  readAvatarBytes: (uri: string) => mockReadAvatarBytes(uri),
  storeOwnAvatarBytes: (bytes: Uint8Array) => mockStoreOwnAvatarBytes(bytes),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    get exists() {
      return mockFileExists;
    }
  },
}));

const uploaded = {
  avatarPath: 'uuid-ana/avatar.jpg',
  avatarUpdatedAt: '2026-08-30T10:14:38.971Z',
};

describe('syncOwnAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists = true;
    mockGetAuthenticatedUserId.mockResolvedValue('uuid-ana');
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'pending',
      remoteUpdatedAt: null,
    });
    mockUploadAvatar.mockResolvedValue(uploaded);
  });

  it('sube los bytes pendientes y guarda la metadata que devuelve la API', async () => {
    await expect(syncOwnAvatar()).resolves.toBe(true);

    expect(mockUploadAvatar).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(mockSaveOwnRemoteAvatar).toHaveBeenCalledWith(
      'file:///avatar.jpg',
      uploaded,
    );
  });

  it('no sube nada en modo invitado', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it('no reintenta una foto ya sincronizada', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'synced',
      remoteUpdatedAt: uploaded.avatarUpdatedAt,
    });

    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it('reintenta una subida que falló antes', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'failed',
      remoteUpdatedAt: null,
    });

    await expect(syncOwnAvatar()).resolves.toBe(true);
    expect(mockUploadAvatar).toHaveBeenCalled();
  });

  it('deja la foto como fallida sin lanzar cuando la subida revienta', async () => {
    mockUploadAvatar.mockRejectedValue(new Error('sin red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // No lanzar es el requisito: se llama desde un efecto sin await.
    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockMarkAvatarUploadResult).toHaveBeenCalledWith(
      'file:///avatar.jpg',
      'failed',
      null,
    );
  });

  it('no sube nada si el archivo local ya no existe', async () => {
    mockFileExists = false;

    await expect(syncOwnAvatar()).resolves.toBe(false);
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });
});

describe('restoreOwnAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvatar.mockResolvedValue(new Uint8Array([9, 9]));
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: null,
      syncStatus: 'local_only',
      remoteUpdatedAt: null,
    });
  });

  it('baja la foto propia por la API al estrenar dispositivo', async () => {
    await expect(
      restoreOwnAvatar({ userId: 'uuid-ana', ...uploaded }),
    ).resolves.toBe(true);

    expect(mockGetAvatar).toHaveBeenCalledWith(
      'uuid-ana',
      uploaded.avatarUpdatedAt,
    );
    expect(mockSaveDownloadedOwnAvatar).toHaveBeenCalledWith({
      localPath: 'file:///document/avatars/profile-avatar.jpg',
      ...uploaded,
    });
  });

  it('no pisa una foto que todavía está pendiente de subir', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'pending',
      remoteUpdatedAt: null,
    });

    await expect(
      restoreOwnAvatar({ userId: 'uuid-ana', ...uploaded }),
    ).resolves.toBe(false);
    expect(mockGetAvatar).not.toHaveBeenCalled();
  });

  it('no redescarga cuando la copia local ya lleva ese sello', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'synced',
      remoteUpdatedAt: uploaded.avatarUpdatedAt,
    });

    await expect(
      restoreOwnAvatar({ userId: 'uuid-ana', ...uploaded }),
    ).resolves.toBe(false);
    expect(mockGetAvatar).not.toHaveBeenCalled();
  });

  it('vuelve a bajarla cuando el sello del servidor es otro', async () => {
    mockGetLocalAvatarUpload.mockResolvedValue({
      localPath: 'file:///avatar.jpg',
      syncStatus: 'synced',
      remoteUpdatedAt: '2026-08-01T00:00:00.000Z',
    });

    await expect(
      restoreOwnAvatar({ userId: 'uuid-ana', ...uploaded }),
    ).resolves.toBe(true);
  });

  it('no hace nada si el servidor dice que no hay foto', async () => {
    await expect(
      restoreOwnAvatar({
        userId: 'uuid-ana',
        avatarPath: null,
        avatarUpdatedAt: null,
      }),
    ).resolves.toBe(false);
    expect(mockGetAvatar).not.toHaveBeenCalled();
  });
});
