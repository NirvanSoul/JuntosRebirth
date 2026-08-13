import { act } from '@testing-library/react-native';

import { SaveConfirmationToast } from '@/components/overlays/SaveConfirmationToast/SaveConfirmationToast';
import { renderWithTheme } from '@/test/renderWithTheme';
import { motion } from '@/theme/motion';

describe('SaveConfirmationToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('muestra el mensaje de confirmación recibido', async () => {
    const screen = await renderWithTheme(
      <SaveConfirmationToast
        notice={{ id: 1, message: 'Recordatorios y alertas actualizados.' }}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId('save-confirmation-toast')).toBeTruthy();
    expect(
      screen.getByText('Recordatorios y alertas actualizados.'),
    ).toBeTruthy();
  });

  it('desaparece y notifica su cierre automáticamente', async () => {
    const onDismiss = jest.fn();
    const screen = await renderWithTheme(
      <SaveConfirmationToast
        notice={{ id: 9, message: 'Cambios guardados.' }}
        onDismiss={onDismiss}
      />,
    );

    await act(() => jest.advanceTimersByTime(motion.toastVisibleDuration));
    expect(screen.queryByTestId('save-confirmation-toast')).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(motion.toastTransitionDuration));
    expect(onDismiss).toHaveBeenCalledWith(9);
  });

  it('no muestra nada sin un aviso activo', async () => {
    const screen = await renderWithTheme(
      <SaveConfirmationToast notice={null} onDismiss={jest.fn()} />,
    );

    expect(screen.queryByTestId('save-confirmation-toast')).toBeNull();
  });
});
