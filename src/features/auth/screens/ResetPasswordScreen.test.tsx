import { fireEvent } from '@testing-library/react-native';

import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { setNewPassword } from '@/features/auth/services/resetPasswordService';
import { AuthApiError } from '@/features/auth/utils/authError';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/auth/services/resetPasswordService');

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra el código técnico cuando el OTP caduca al cambiar la contraseña', async () => {
    jest
      .mocked(setNewPassword)
      .mockRejectedValueOnce(
        new AuthApiError(
          'OTP_EXPIRED',
          'El código ha caducado. Solicita uno nuevo para continuar.',
        ),
      );

    const screen = await renderWithTheme(
      <ResetPasswordScreen
        code="123456"
        email="ana@ejemplo.com"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    await fireEvent.changeText(
      screen.getByTestId('reset-password-new'),
      'nueva-contrasena',
    );
    await fireEvent.changeText(
      screen.getByTestId('reset-password-confirm'),
      'nueva-contrasena',
    );
    await fireEvent.press(screen.getByTestId('reset-password-submit'));

    expect(
      await screen.findByText(
        'El código ha caducado. Solicita uno nuevo para continuar.\nCódigo: OTP_EXPIRED',
      ),
    ).toBeTruthy();
    expect(setNewPassword).toHaveBeenCalledWith({
      code: '123456',
      email: 'ana@ejemplo.com',
      password: 'nueva-contrasena',
    });
  });
});
