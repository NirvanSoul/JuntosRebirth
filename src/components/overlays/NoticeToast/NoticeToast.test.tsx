import Ionicons from '@expo/vector-icons/Ionicons';
import { act, fireEvent } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import {
  NoticeToast,
  type ToastNotice,
} from '@/components/overlays/NoticeToast/NoticeToast';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors, darkColors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';

jest.mock('@/lib/haptics/haptics', () => ({ triggerHaptic: jest.fn() }));

function renderToast(notice: ToastNotice | null, onDismiss = jest.fn()) {
  return renderWithTheme(<NoticeToast notice={notice} onDismiss={onDismiss} />);
}

describe('NoticeToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.mocked(triggerHaptic).mockClear();
  });

  it('vibra de forma sutil una vez por cada aviso nuevo', async () => {
    const notice = { id: 1, message: 'Movimiento copiado' };
    const screen = await renderToast(notice);
    expect(triggerHaptic).toHaveBeenCalledTimes(1);
    expect(triggerHaptic).toHaveBeenCalledWith('noticeShow');

    await screen.rerender(
      <NoticeToast notice={{ ...notice }} onDismiss={jest.fn()} />,
    );
    expect(triggerHaptic).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <NoticeToast notice={{ ...notice, id: 2 }} onDismiss={jest.fn()} />,
    );
    expect(triggerHaptic).toHaveBeenCalledTimes(2);
  });

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
    // Sin `onPress` no se insinúa que la tarjeta se pueda tocar.
    expect(
      screen.queryByTestId('notice-toast-chevron', {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(
      screen.getByText('Recordatorios y alertas actualizados.'),
    ).toBeTruthy();
  });

  it('flota abajo sobre el menú principal con un icono propio a la izquierda', async () => {
    const screen = await renderToast({
      id: 3,
      leading: <View testID="custom-leading" />,
      message: 'Movimiento copiado',
      placement: 'bottom',
    });

    const style = StyleSheet.flatten(
      screen.getByTestId('notice-toast').props.style,
    );
    expect(style.top).toBeUndefined();
    expect(style.bottom).toBeGreaterThan(layout.floatingActionSize);
    expect(screen.getByTestId('custom-leading')).toBeTruthy();
    expect(
      screen.queryByTestId('notice-toast-icon', {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(screen.getByLabelText('Movimiento copiado')).toBeTruthy();
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

  it('con onPress toda la tarjeta es un botón que se retira y lo ejecuta', async () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    const screen = await renderToast(
      {
        id: 4,
        message: 'Gasto agregado',
        onPress,
        placement: 'bottom',
        pressHint: 'Abre el detalle del movimiento',
      },
      onDismiss,
    );

    const card = screen.getByRole('button', { name: 'Gasto agregado' });
    expect(card.props.accessibilityHint).toBe('Abre el detalle del movimiento');
    expect(screen.getByTestId('notice-toast').props.pointerEvents).toBe('auto');
    expect(
      screen.getByTestId('notice-toast-chevron', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(card);
    });
    expect(onDismiss).toHaveBeenCalledWith(4);
    expect(onPress).toHaveBeenCalledTimes(1);
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

  it('en modo oscuro invierte texto, icono y flecha para contrastar con la tarjeta clara', async () => {
    const screen = await renderWithTheme(
      <NoticeToast
        notice={{ id: 5, message: 'Gasto agregado', onPress: jest.fn() }}
        onDismiss={jest.fn()}
      />,
      { appearance: 'dark' },
    );

    const colorOf = (testID: string) =>
      StyleSheet.flatten(
        screen.getByTestId(testID, { includeHiddenElements: true }).props.style,
      ).color;
    expect(
      StyleSheet.flatten(screen.getByText('Gasto agregado').props.style).color,
    ).toBe(darkColors.onInverse);
    expect(colorOf('notice-toast-chevron')).toBe(darkColors.onInverse);
    expect(
      StyleSheet.flatten(screen.getByTestId('notice-toast').props.style)
        .backgroundColor,
    ).toBe(darkColors.textPrimary);
  });

  it('no muestra nada sin un aviso activo', async () => {
    const screen = await renderToast(null);

    expect(screen.queryByTestId('notice-toast')).toBeNull();
  });
});
