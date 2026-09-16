import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';

import {
  __resetGoogleSigninForTest,
  __setGoogleSigninSupportedForTest,
  coolDownAuthSession,
  signInWithGoogleNative,
  warmUpAuthSession,
} from '@/features/auth/services/googleAuth';
import { authClient } from '@/lib/auth-client';

describe('googleAuth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetGoogleSigninForTest();
  });

  it('inicia sesión nativa correctamente y envía el idToken a Better Auth', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce({
      data: {
        idToken: 'test-valid-id-token',
        user: { email: 'test@juntos.app', name: 'Test User' },
      },
    } as never);
    jest.mocked(authClient.signIn.social).mockResolvedValueOnce({
      data: { session: { id: 's1' }, user: { id: 'u1' } },
      error: null,
    } as never);

    const result = await signInWithGoogleNative();

    expect(GoogleSignin.configure).toHaveBeenCalled();
    expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
    expect(GoogleSignin.signIn).toHaveBeenCalled();
    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: 'google',
      idToken: {
        token: 'test-valid-id-token',
      },
    });
    expect(result).toEqual({ status: 'success' });
  });

  it('maneja idToken ubicado en la raíz del response (compatibilidad defensiva)', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce({
      idToken: 'legacy-root-token',
    } as never);
    jest.mocked(authClient.signIn.social).mockResolvedValueOnce({
      data: { session: { id: 's1' }, user: { id: 'u1' } },
      error: null,
    } as never);

    const result = await signInWithGoogleNative();

    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: 'google',
      idToken: {
        token: 'legacy-root-token',
      },
    });
    expect(result).toEqual({ status: 'success' });
  });

  it('retorna error cuando Google no devuelve idToken', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce({
      data: null,
    } as never);

    const result = await signInWithGoogleNative();

    expect(result).toEqual({
      status: 'error',
      message: 'No se recibió la confirmación de identidad de Google.',
    });
    expect(authClient.signIn.social).not.toHaveBeenCalled();
  });

  it('retorna cancelled cuando el usuario cancela el selector nativo', async () => {
    jest.mocked(GoogleSignin.signIn).mockRejectedValueOnce({
      code: statusCodes.SIGN_IN_CANCELLED,
    });

    const result = await signInWithGoogleNative();

    expect(result).toEqual({ status: 'cancelled' });
    expect(authClient.signIn.social).not.toHaveBeenCalled();
  });

  it('retorna error amigable cuando el inicio ya está en progreso', async () => {
    jest.mocked(GoogleSignin.signIn).mockRejectedValueOnce({
      code: statusCodes.IN_PROGRESS,
    });

    const result = await signInWithGoogleNative();

    expect(result).toEqual({
      status: 'error',
      message: 'Ya hay un inicio de sesión con Google en curso.',
    });
  });

  it('retorna error amigable cuando Play Services no está disponible', async () => {
    jest.mocked(GoogleSignin.hasPlayServices).mockRejectedValueOnce({
      code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
    });

    const result = await signInWithGoogleNative();

    expect(result).toEqual({
      status: 'error',
      message:
        'Los servicios de Google Play no están disponibles o requieren actualización.',
    });
  });

  it('retorna error cuando Better Auth responde con fallo', async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce({
      data: {
        idToken: 'test-valid-id-token',
        user: { email: 'test@juntos.app', name: 'Test User' },
      },
    } as never);
    jest.mocked(authClient.signIn.social).mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid token' },
    } as never);

    const result = await signInWithGoogleNative();

    expect(result).toEqual({
      status: 'error',
      message: 'No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.',
    });
  });

  it('retorna mensaje de error genérico ante excepciones no controladas', async () => {
    jest
      .mocked(GoogleSignin.signIn)
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await signInWithGoogleNative();

    expect(result).toEqual({
      status: 'error',
      message: 'No pudimos continuar con Google. Inténtalo de nuevo.',
    });
  });

  it('retorna unsupported cuando isGoogleSigninNativeSupported retorna false', async () => {
    __setGoogleSigninSupportedForTest(false);
    const result = await signInWithGoogleNative();
    expect(result).toEqual({ status: 'unsupported' });
  });

  it('warmUpAuthSession precalienta WebBrowser y configura GoogleSignin', () => {
    warmUpAuthSession();
    expect(WebBrowser.warmUpAsync).toHaveBeenCalled();
    expect(GoogleSignin.configure).toHaveBeenCalled();
  });

  it('coolDownAuthSession libera WebBrowser', () => {
    coolDownAuthSession();
    expect(WebBrowser.coolDownAsync).toHaveBeenCalled();
  });
});
