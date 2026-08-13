import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { VerifyCodeScreen } from '@/features/auth/screens/VerifyCodeScreen';
import { verifyCode } from '@/features/auth/services/verifyCodeService';
import { renderWithTheme } from '@/test/renderWithTheme';
import { motion } from '@/theme/motion';

jest.mock('@/features/auth/services/verifyCodeService');

describe('VerifyCodeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tras confirmar el registro, muestra el checkmark de éxito y avanza automáticamente', async () => {
    jest.useFakeTimers();
    jest.mocked(verifyCode).mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const screen = await renderWithTheme(
      <VerifyCodeScreen
        email="ana@ejemplo.com"
        onCancel={jest.fn()}
        onSuccess={onSuccess}
        purpose="signup"
      />,
    );

    await fireEvent.changeText(
      screen.getByTestId('verify-code-input'),
      '123456',
    );
    await fireEvent.press(screen.getByTestId('verify-code-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('verify-code-success')).toBeTruthy(),
    );
    expect(screen.getByText('¡Cuenta creada!')).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(motion.authSuccessAutoContinueDelay);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('permite continuar de inmediato tocando el botón, sin esperar al avance automático', async () => {
    jest.mocked(verifyCode).mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const screen = await renderWithTheme(
      <VerifyCodeScreen
        email="ana@ejemplo.com"
        onCancel={jest.fn()}
        onSuccess={onSuccess}
        purpose="signup"
      />,
    );

    await fireEvent.changeText(
      screen.getByTestId('verify-code-input'),
      '123456',
    );
    await fireEvent.press(screen.getByTestId('verify-code-submit'));

    await fireEvent.press(
      await screen.findByTestId('verify-code-success-continue'),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('en recuperación de contraseña, continúa directo sin mostrar el checkmark de cuenta creada', async () => {
    jest.mocked(verifyCode).mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const screen = await renderWithTheme(
      <VerifyCodeScreen
        email="ana@ejemplo.com"
        onCancel={jest.fn()}
        onSuccess={onSuccess}
        purpose="recovery"
      />,
    );

    await fireEvent.changeText(
      screen.getByTestId('verify-code-input'),
      '123456',
    );
    await fireEvent.press(screen.getByTestId('verify-code-submit'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('verify-code-success')).toBeNull();
  });
});
