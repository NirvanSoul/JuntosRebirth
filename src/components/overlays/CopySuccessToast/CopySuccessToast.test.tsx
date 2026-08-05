import Ionicons from '@expo/vector-icons/Ionicons';
import { act, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CopySuccessToast } from '@/components/overlays/CopySuccessToast/CopySuccessToast';
import { colors } from '@/theme/colors';
import { motion } from '@/theme/motion';

describe('CopySuccessToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('confirma la copia con contraste, icono y énfasis verde', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <CopySuccessToast
          notice={{
            destinationName: 'Pareja',
            id: 1,
            itemName: 'Comida',
          }}
          onDismiss={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    const toast = screen.getByTestId('copy-success-toast');
    expect(
      screen.getByLabelText('Comida copiado en Pareja exitosamente.'),
    ).toBeTruthy();
    expect(StyleSheet.flatten(toast.props.style).backgroundColor).toBe(
      colors.textPrimary,
    );
    const successIcon = screen.getByTestId('copy-success-icon', {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(successIcon.props.style).color).toBe(
      colors.income,
    );
    expect(
      StyleSheet.flatten(screen.getByText('exitosamente.').props.style).color,
    ).toBe(colors.income);
    expect(successIcon.props.children).toContain(
      String.fromCodePoint(Number(Ionicons.glyphMap['checkmark-circle'])),
    );
  });

  it('desaparece y notifica su cierre automáticamente', async () => {
    const onDismiss = jest.fn();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <CopySuccessToast
          notice={{ destinationName: 'Casa', id: 7, itemName: 'Taxi' }}
          onDismiss={onDismiss}
        />
      </SafeAreaProvider>,
    );

    await act(() => jest.advanceTimersByTime(motion.toastVisibleDuration));
    expect(screen.queryByTestId('copy-success-toast')).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(motion.toastTransitionDuration));
    expect(onDismiss).toHaveBeenCalledWith(7);
  });
});
