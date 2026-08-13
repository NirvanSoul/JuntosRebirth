import { fireEvent } from '@testing-library/react-native';

import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockMarkAuthenticated = jest.fn();
const mockMarkGuestComplete = jest.fn();

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({
    markAuthenticated: mockMarkAuthenticated,
    markGuestComplete: mockMarkGuestComplete,
  }),
}));

jest.mock('@/features/auth/screens/LoginScreen', () => ({
  LoginScreen: () => null,
}));
jest.mock('@/features/auth/screens/SignUpScreen', () => ({
  SignUpScreen: () => null,
  signUpTotalSteps: 4,
}));
jest.mock('@/features/auth/screens/VerifyCodeScreen', () => ({
  VerifyCodeScreen: () => null,
}));
jest.mock('@/features/auth/screens/ForgotPasswordScreen', () => ({
  ForgotPasswordScreen: () => null,
}));
jest.mock('@/features/auth/screens/ResetPasswordScreen', () => ({
  ResetPasswordScreen: () => null,
}));

describe('AccessScreen', () => {
  beforeEach(() => {
    mockMarkAuthenticated.mockReset();
    mockMarkGuestComplete.mockReset();
  });

  it('mantiene visible la entrada como invitado y la persiste al elegirla', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-continue-guest'));

    expect(mockMarkGuestComplete).toHaveBeenCalledTimes(1);
  });

  it('abre el paso de crear cuenta', async () => {
    const screen = await renderWithTheme(<AccessScreen />);

    fireEvent.press(screen.getByTestId('access-open-signup'));

    expect(screen.getByText('Crear cuenta')).toBeTruthy();
  });
});
