import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { authClient } from '@/lib/auth-client';
import { listRemoteSpaces } from '@/services/api/spaces';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/auth/hooks/useBetterAuthSession');
jest.mock('@/features/auth/services/sessionInitialization', () => ({
  initializeAuthenticatedSession: jest.fn(async () => undefined),
}));
jest.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: jest.fn(),
    hydrateSession: jest.fn(),
    signIn: { social: jest.fn() },
  },
}));
jest.mock('@/services/api/spaces', () => ({ listRemoteSpaces: jest.fn() }));

describe('LoginScreen — Google', () => {
  let session: { user: { id: string } } | null;

  beforeEach(() => {
    jest.clearAllMocks();
    session = null;
    jest.mocked(useBetterAuthSession).mockImplementation(() => ({
      error: null,
      isReady: true,
      session: session as never,
    }));
  });

  it('espera session.user antes de cargar los espacios y completar el acceso', async () => {
    const onSuccess = jest.fn();
    jest.mocked(authClient.signIn.social).mockResolvedValue({
      data: { url: 'https://accounts.google.com' },
      error: null,
    } as never);
    jest.mocked(listRemoteSpaces).mockResolvedValue([]);

    const view = await renderWithTheme(
      <LoginScreen onCancel={jest.fn()} onSuccess={onSuccess} />,
    );

    await fireEvent.press(screen.getByTestId('login-google'));
    expect(authClient.signIn.social).toHaveBeenCalledWith({
      callbackURL: 'juntoss://oauth/google',
      provider: 'google',
    });
    expect(listRemoteSpaces).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => {
      session = { user: { id: 'user-1' } };
      view.rerender(<LoginScreen onCancel={jest.fn()} onSuccess={onSuccess} />);
    });

    await waitFor(() => expect(listRemoteSpaces).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('restablece el botón después de cancelar Google', async () => {
    jest.mocked(authClient.signIn.social).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await renderWithTheme(
      <LoginScreen onCancel={jest.fn()} onSuccess={jest.fn()} />,
    );

    await fireEvent.press(screen.getByTestId('login-google'));

    expect(
      await screen.findByText('Cancelaste el inicio de sesión con Google.'),
    ).toBeTruthy();
    expect(screen.getByTestId('login-google').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });
});
