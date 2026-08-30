import { cacheMemberAvatars } from '@/features/profile/services/cacheMemberAvatars';

const mockGetAvatar = jest.fn();
const mockListSpaceMemberProfiles = jest.fn();
const mockSaveSpaceMemberAvatarCache = jest.fn();
const mockExistingFileNames = new Set<string>();
const mockDeletedFileNames: string[] = [];
const mockWrittenFileNames: string[] = [];

jest.mock('@/services/api/avatar', () => ({
  getAvatar: (...args: unknown[]) => mockGetAvatar(...args),
}));

jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({
    listSpaceMemberProfiles: (...args: unknown[]) =>
      mockListSpaceMemberProfiles(...args),
    saveSpaceMemberAvatarCache: (...args: unknown[]) =>
      mockSaveSpaceMemberAvatarCache(...args),
  }),
);

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(directory: { uri: string } | string, name?: string) {
      const base = typeof directory === 'string' ? directory : directory.uri;
      this.uri = name ? `${base}/${name}` : base;
    }
    get name() {
      return this.uri.split('/').pop() ?? '';
    }
    get exists() {
      return mockExistingFileNames.has(this.name);
    }
    create() {}
    write() {
      mockWrittenFileNames.push(this.name);
    }
    delete() {
      mockDeletedFileNames.push(this.name);
    }
  }

  class MockDirectory {
    uri = 'file:///documents/avatars/members';
    exists = true;
    create() {}
    list() {
      return [...mockExistingFileNames].map(
        (name) => new MockFile({ uri: this.uri }, name),
      );
    }
  }

  return { File: MockFile, Directory: MockDirectory, Paths: { document: '' } };
});

const beto = {
  userId: 'uuid-beto',
  displayName: 'Beto',
  avatarPath: 'uuid-beto/avatar.jpg',
  avatarUpdatedAt: '2026-08-17T10:00:00.000Z',
  avatarUri: null,
};

describe('cacheMemberAvatars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistingFileNames.clear();
    mockDeletedFileNames.length = 0;
    mockWrittenFileNames.length = 0;
    mockGetAvatar.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockListSpaceMemberProfiles.mockResolvedValue([beto]);
  });

  it('descarga y cachea la foto que todavía no está en disco', async () => {
    await cacheMemberAvatars('space-1');

    // Se pide por la ruta de la API, no por la clave del almacenamiento.
    expect(mockGetAvatar).toHaveBeenCalledWith(
      'uuid-beto',
      '2026-08-17T10:00:00.000Z',
    );
    expect(mockWrittenFileNames).toEqual(['uuid-beto__20260817100000000.jpg']);
    expect(mockSaveSpaceMemberAvatarCache).toHaveBeenCalled();
  });

  it('no vuelve a descargar cuando el sello del archivo coincide', async () => {
    mockExistingFileNames.add('uuid-beto__20260817100000000.jpg');

    await cacheMemberAvatars('space-1');

    // Sin esta comprobación, cada sincronización redescargaría la misma foto.
    expect(mockGetAvatar).not.toHaveBeenCalled();
  });

  it('redescarga cuando la otra persona cambia de foto', async () => {
    mockExistingFileNames.add('uuid-beto__20260101000000000.jpg');

    await cacheMemberAvatars('space-1');

    expect(mockGetAvatar).toHaveBeenCalled();
    expect(mockDeletedFileNames).toContain('uuid-beto__20260101000000000.jpg');
  });

  it('borra la copia de quien ya no está en el censo', async () => {
    mockListSpaceMemberProfiles.mockResolvedValue([]);
    mockExistingFileNames.add('uuid-zoe__20260101000000000.jpg');

    await cacheMemberAvatars('space-1');

    expect(mockDeletedFileNames).toContain('uuid-zoe__20260101000000000.jpg');
  });

  it('ignora a quien todavía no tiene foto', async () => {
    mockListSpaceMemberProfiles.mockResolvedValue([
      { ...beto, avatarPath: null, avatarUpdatedAt: null },
    ]);

    await cacheMemberAvatars('space-1');

    expect(mockGetAvatar).not.toHaveBeenCalled();
    expect(mockWrittenFileNames).toEqual([]);
  });

  it('no escribe nada si la descarga vuelve vacía', async () => {
    mockGetAvatar.mockResolvedValue(null);

    await cacheMemberAvatars('space-1');

    expect(mockWrittenFileNames).toEqual([]);
  });
});
