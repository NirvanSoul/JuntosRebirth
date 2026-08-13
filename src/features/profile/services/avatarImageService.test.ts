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
const mockResize = jest.fn(() => ({ renderAsync: mockRenderAsync }));
const mockManipulate = jest.fn((_uri: string) => ({ resize: mockResize }));
const mockSaveAsync = jest.fn();

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: 'jpeg' },
}));

const mockFileDelete = jest.fn();
const mockFileCopy = jest.fn();
const mockDirectoryCreate = jest.fn();
let mockDestinationExists = false;

jest.mock('expo-file-system', () => {
  class File {
    uri = 'file:///document/avatars/profile-avatar.jpg';
    exists = mockDestinationExists;
    delete = mockFileDelete;
    copy = mockFileCopy;
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
      assets: [{ uri: 'file:///picked.jpg' }],
    });

    const result = await pickAndStoreAvatar('library');

    expect(mockManipulate).toHaveBeenCalledWith('file:///picked.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: 512, height: 512 });
    expect(mockSaveAsync).toHaveBeenCalledWith({
      compress: 0.6,
      format: 'jpeg',
    });
    expect(mockFileDelete).toHaveBeenCalled();
    expect(mockFileCopy).toHaveBeenCalled();
    expect(result).toBe('file:///document/avatars/profile-avatar.jpg');
  });
});
