import { AppBootstrap } from '@/app/AppBootstrap';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockUseSession = jest.fn();
let mockFontsLoaded = false;

jest.mock('expo-font', () => ({
  useFonts: () => [mockFontsLoaded, null],
}));
jest.mock('@/lib/notifications/localNotifications', () => ({
  ensureNotificationHandlerRegistered: jest.fn(),
}));
jest.mock('@/lib/notifications/InvitationPushRegistration', () => ({
  InvitationPushRegistration: () => null,
}));
jest.mock('@/navigation/RootNavigator', () => ({
  RootNavigator: ({ fontsReady }: { fontsReady: boolean }) => {
    mockUseSession(fontsReady);
    return null;
  },
}));

it('monta el navegador para restaurar la sesión mientras cargan las fuentes', async () => {
  mockFontsLoaded = false;
  const screen = await renderWithTheme(<AppBootstrap />);
  expect(mockUseSession).toHaveBeenCalledWith(false);

  mockFontsLoaded = true;
  await screen.rerender(<AppBootstrap />);
  expect(mockUseSession).toHaveBeenLastCalledWith(true);
});
