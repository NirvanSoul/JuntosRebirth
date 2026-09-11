import Ionicons from '@expo/vector-icons/Ionicons';
import { act, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  NoticeToast,
  type ToastNotice,
} from '@/components/overlays/NoticeToast/NoticeToast';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';
import { motion } from '@/theme/motion';

function renderToast(notice: ToastNotice | null, onDismiss = jest.fn()) {
  return renderWithTheme(<NoticeToast notice={notice} onDismiss={onDismiss} />);
}

describe('NoticeToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('confirma con contraste, icono y énfasis en el color del tono', async () => {
    const screen = await renderToast({
      id: 1,
      message: 'Comida copiado en Pareja ',
      emphasis: 'exitosamente.',
      tone: 'success',
    });

    const toast = screen.getByTestId('notice-toast');
    expect(
      screen.getByLabelText('Comida copiado en Pareja exitosamente.'),
    ).toBeTruthy();
    expect(StyleSheet.flatten(toast.props.style).backgroundColor).toBe(
      colors.textPrimary,
    );
    const icon = screen.getByTestId('notice-toast-icon', {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(icon.props.style).color).toBe(colors.income);
    expect(icon.props.children).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['checkmark-circle'])),
    );
    expect(
      StyleSheet.flatten(screen.getByText('exitosamente.').props.style).color,
    ).toBe(colors.income);
    // Sin acción, los toques atraviesan el aviso.
    expect(toast.props.pointerEvents).toBe('none');
  });

  it('muestra un mensaje llano sin énfasis', async () => {
    const screen = await renderToast({
      id: 2,
      message: 'Recordatorios y alertas actualizados.',
    });

    expect(screen.getByTestId('notice-toast')).toBeTruthy();
    expect(
      screen.getByText('Recordatorios y alertas actualizados.'),
    ).toBeTruthy();
  });

  it('desaparece y notifica su cierre automáticamente', async () => {
    const onDismiss = jest.fn();
    const screen = await renderToast(
      { id: 7, message: 'Taxi copiado en Casa ', emphasis: 'exitosamente.' },
      onDismiss,
    );

    await act(() => jest.advanceTimersByTime(motion.toastVisibleDuration));
    expect(screen.queryByTestId('notice-toast')).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(motion.toastTransitionDuration));
    expect(onDismiss).toHaveBeenCalledWith(7);
  });

  it('renderiza la acción, captura el toque y espera más antes de retirarse', async () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    const screen = await renderToast(
      {
        id: 3,
        message: 'No pudimos sincronizar tus datos.',
        tone: 'warning',
        action: { label: 'Reintentar', onPress },
      },
      onDismiss,
    );

    const toast = screen.getByTestId('notice-toast');
    expect(toast.props.pointerEvents).toBe('auto');
    const icon = screen.getByTestId('notice-toast-icon', {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(icon.props.style).color).toBe(colors.expense);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    });
    expect(onPress).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(motion.toastVisibleDuration));
    expect(screen.getByTestId('notice-toast')).toBeTruthy();
    await act(() =>
      jest.advanceTimersByTime(
        motion.toastActionVisibleDuration - motion.toastVisibleDuration,
      ),
    );
    expect(screen.queryByTestId('notice-toast')).toBeNull();
    await act(() => jest.advanceTimersByTime(motion.toastTransitionDuration));
    expect(onDismiss).toHaveBeenCalledWith(3);
  });

  it('usa el icono de sin conexión para el tono informativo', async () => {
    const screen = await renderToast({
      id: 4,
      message: 'Sin conexión.',
      tone: 'info',
    });

    const icon = screen.getByTestId('notice-toast-icon', {
      includeHiddenElements: true,
    });
    expect(icon.props.children).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['cloud-offline-outline'])),
    );
  });

  it('no muestra nada sin un aviso activo', async () => {
    const screen = await renderToast(null);

    expect(screen.queryByTestId('notice-toast')).toBeNull();
  });
});
