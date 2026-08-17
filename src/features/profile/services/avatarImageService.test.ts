import { pickAndStoreAvatar } from '@/features/profile/services/avatarImageService';

const mockRequestCameraPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: () => mockRequestCameraPermissionsAsync(),
  requestMediaLibraryPermissionsAsync: () =>
    mockRequestMediaLibraryPermissionsAsync(),
  launchCameraAsync: (options: unknown) => mockLaunchCameraAsync(options),
  launchImageLibraryAsync: (options: unknown) =>
    mockLaunchImageLibraryAsync(options),
}));

const mockRenderAsync = jest.fn();
const mockResize = jest.fn();
// `manipulate` devuelve un contexto donde `resize` es opcional: el servicio
// puede pasar directamente a `renderAsync` si la foto ya es bastante pequeña.
const mockManipulate = jest.fn((_uri: string) => ({
  resize: mockResize,
  renderAsync: mockRenderAsync,
}));
const mockSaveAsync = jest.fn();

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: 'jpeg' },
}));

const mockFileDelete = jest.fn();
const mockFileCopy = jest.fn();
const mockDirectoryCreate = jest.fn();
let mockDestinationExists = false;
let mockStoredSize = 30_000;

jest.mock('expo-file-system', () => {
  class File {
    uri = 'file:///document/avatars/profile-avatar.jpg';
    exists = mockDestinationExists;
    delete = mockFileDelete;
    copy = mockFileCopy;
    info() {
      return { size: mockStoredSize };
    }
  }
  class Directory {
    exists = false;
    create = mockDirectoryCreate;
  }
  return { File, Directory, Paths: { document: 'file:///document' } };
});

describe('pickAndStoreAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationExists = false;
    mockStoredSize = 30_000;
    mockResize.mockReturnValue({ renderAsync: mockRenderAsync });
    mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync });
    mockSaveAsync.mockResolvedValue({ uri: 'file:///cache/compressed.jpg' });
  });

  it('devuelve null cuando la persona cancela la selección', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(pickAndStoreAvatar('library')).resolves.toBeNull();
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('lanza un error cuando se deniega el permiso y no abre el selector', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(pickAndStoreAvatar('camera')).rejects.toThrow();
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });

  it('comprime la imagen elegida y reemplaza cualquier avatar previo', async () => {
    mockDestinationExists = true;
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg', width: 2000, height: 2000 }],
    });

    const result = await pickAndStoreAvatar('library');

    expect(mockManipulate).toHaveBeenCalledWith('file:///picked.jpg');
    // Solo el ancho: el alto lo deriva la librería, así un recorte que no sea
    // exactamente cuadrado no se deforma.
    expect(mockResize).toHaveBeenCalledWith({ width: 320 });
    expect(mockSaveAsync).toHaveBeenCalledWith({
      compress: 0.7,
      format: 'jpeg',
    });
    expect(mockFileDelete).toHaveBeenCalled();
    expect(mockFileCopy).toHaveBeenCalled();
    expect(result).toBe('file:///document/avatars/profile-avatar.jpg');
  });

  it('no agranda una foto que ya es más pequeña que la miniatura', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg', width: 180, height: 180 }],
    });

    await pickAndStoreAvatar('library');

    // Reescalar hacia arriba solo añade peso: no gana nitidez ninguna.
    expect(mockResize).not.toHaveBeenCalled();
    expect(mockSaveAsync).toHaveBeenCalled();
  });

  it('rechaza y borra la foto si tras comprimir sigue pasándose de tamaño', async () => {
    mockStoredSize = 500_000;
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg', width: 2000, height: 2000 }],
    });

    // Falla aquí, con un mensaje traducible, en vez de dejar que Storage
    // devuelva un 413 opaco a mitad de la subida.
    await expect(pickAndStoreAvatar('library')).rejects.toThrow(
      /demasiado grande/,
    );
    expect(mockFileDelete).toHaveBeenCalled();
  });
});
