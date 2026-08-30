import {
  pickAvatarImage,
  prepareAvatarImage,
  recompressAvatarImage,
} from '@/features/profile/services/avatarImageService';
import { AvatarError } from '@/features/profile/services/avatarImage';

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

const mockCrop = jest.fn();
const mockResize = jest.fn();
const mockSaveAsync = jest.fn();
// El contexto es encadenable: `crop` y `resize` devuelven el mismo objeto y
// `renderAsync` cierra la cadena, igual que en expo-image-manipulator 14.
const context = {
  crop: (...args: unknown[]) => {
    mockCrop(...args);
    return context;
  },
  resize: (...args: unknown[]) => {
    mockResize(...args);
    return context;
  },
  renderAsync: async () => ({ saveAsync: mockSaveAsync }),
};
const mockManipulate = jest.fn((_uri: string) => context);

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: 'jpeg' },
}));

/** Tamaños que devolverá `File.size`, en el orden en que se guarden. */
let mockFileSizes: number[] = [];

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get size() {
      return mockFileSizes.shift() ?? 0;
    }
  },
  Directory: class {
    exists = true;
    create() {}
  },
  Paths: { document: 'file:///document' },
}));

describe('pickAvatarImage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('devuelve null cuando la persona cancela la selección', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(pickAvatarImage('library')).resolves.toBeNull();
  });

  it('no abre el selector si se deniega el permiso', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(pickAvatarImage('camera')).rejects.toMatchObject({
      code: 'AVATAR_PERMISSION_DENIED',
    });
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });
});

describe('prepareAvatarImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileSizes = [];
    mockSaveAsync.mockImplementation(async () => ({
      uri: 'file:///cache/avatar.jpg',
      width: 512,
      height: 512,
    }));
  });

  it('recorta el centro antes de escalar, para no deformar una apaisada', async () => {
    mockFileSizes = [48_000];

    await prepareAvatarImage({
      uri: 'file:///picked.jpg',
      width: 1200,
      height: 800,
    });

    expect(mockCrop).toHaveBeenCalledWith({
      originX: 200,
      originY: 0,
      width: 800,
      height: 800,
    });
    expect(mockResize).toHaveBeenCalledWith({ width: 512, height: 512 });
    // El recorte va antes que el escalado: al revés estiraría la cara.
    expect(mockCrop.mock.invocationCallOrder[0]).toBeLessThan(
      mockResize.mock.invocationCallOrder[0]!,
    );
  });

  it('exporta JPEG explícitamente, sin fiarse de la extensión', async () => {
    mockFileSizes = [48_000];

    await prepareAvatarImage({
      uri: 'file:///picked.png',
      width: 900,
      height: 900,
    });

    expect(mockSaveAsync).toHaveBeenCalledWith({
      compress: 0.8,
      format: 'jpeg',
    });
  });

  it('no agranda una foto menor que el objetivo', async () => {
    mockFileSizes = [12_000];

    await prepareAvatarImage({
      uri: 'file:///picked.jpg',
      width: 200,
      height: 200,
    });

    expect(mockResize).toHaveBeenCalledWith({ width: 200, height: 200 });
  });

  it('rechaza una foto por debajo del mínimo sin llamar al manipulador', async () => {
    await expect(
      prepareAvatarImage({ uri: 'file:///tiny.jpg', width: 32, height: 32 }),
    ).rejects.toMatchObject({ code: 'AVATAR_TOO_SMALL' });
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('baja la calidad hasta caber, midiendo el fichero real en cada intento', async () => {
    // 0.8 y 0.7 se pasan del presupuesto; 0.6 entra.
    mockFileSizes = [400_000, 300_000, 180_000];

    const prepared = await prepareAvatarImage({
      uri: 'file:///picked.jpg',
      width: 3024,
      height: 3024,
    });

    expect(mockSaveAsync).toHaveBeenCalledTimes(3);
    expect(mockSaveAsync).toHaveBeenNthCalledWith(3, {
      compress: 0.6,
      format: 'jpeg',
    });
    expect(prepared.quality).toBe(0.6);
    expect(prepared.bytes).toBe(180_000);
    // Se mantiene 512x512: se baja calidad, no resolución.
    expect(mockResize).toHaveBeenCalledTimes(1);
  });

  it('se rinde tras agotar la escalera en vez de girar sin fin', async () => {
    mockFileSizes = [900_000, 800_000, 700_000, 600_000, 500_000];

    await expect(
      prepareAvatarImage({
        uri: 'file:///picked.jpg',
        width: 3024,
        height: 3024,
      }),
    ).rejects.toBeInstanceOf(AvatarError);
    expect(mockSaveAsync).toHaveBeenCalledTimes(5);
  });
});

describe('recompressAvatarImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveAsync.mockImplementation(async () => ({
      uri: 'file:///cache/avatar.jpg',
      width: 512,
      height: 512,
    }));
  });

  it('reanuda por debajo de la calidad ya usada, sin repetirla', async () => {
    mockFileSizes = [100_000];

    const prepared = await recompressAvatarImage(
      { uri: 'file:///picked.jpg', width: 1000, height: 1000 },
      0.8,
    );

    expect(mockSaveAsync).toHaveBeenCalledTimes(1);
    expect(mockSaveAsync).toHaveBeenCalledWith({
      compress: 0.7,
      format: 'jpeg',
    });
    expect(prepared.quality).toBe(0.7);
  });

  it('no reintenta cuando ya se usó el suelo de calidad', async () => {
    await expect(
      recompressAvatarImage(
        { uri: 'file:///picked.jpg', width: 1000, height: 1000 },
        0.4,
      ),
    ).rejects.toMatchObject({ code: 'AVATAR_TOO_LARGE' });
    expect(mockSaveAsync).not.toHaveBeenCalled();
  });
});
