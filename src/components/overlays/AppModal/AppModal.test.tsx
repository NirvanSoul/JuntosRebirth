import { act, fireEvent, render } from '@testing-library/react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppModal } from '@/components/overlays/AppModal/AppModal';

let latestOnDismiss: (() => void) | null = null;
let latestPresent: jest.Mock = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const BottomSheetModal = React.forwardRef(
    (
      { children, onDismiss }: { children?: ReactNode; onDismiss?: () => void },
      ref: React.ForwardedRef<{ present: () => void; dismiss: () => void }>,
    ) => {
      latestOnDismiss = onDismiss ?? null;
      const present = jest.fn();
      latestPresent = present;
      React.useImperativeHandle(ref, () => ({
        present,
        dismiss: jest.fn(),
      }));
      return <View>{children}</View>;
    },
  );
  BottomSheetModal.displayName = 'BottomSheetModalMock';

  return {
    BottomSheetModal,
    BottomSheetView: ({ children }: { children?: ReactNode }) => (
      <View>{children}</View>
    ),
    BottomSheetBackdrop: () => null,
  };
});

jest.mock('expo-blur', () => ({ BlurView: () => null }));

function Harness({ onCloseSpy }: { onCloseSpy: () => void }) {
  const [visible, setVisible] = useState(true);
  const close = () => {
    onCloseSpy();
    setVisible(false);
  };

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <View>
        <Pressable onPress={close} testID="close" />
        <Pressable onPress={() => setVisible(true)} testID="reopen" />
        <AppModal onClose={close} visible={visible}>
          <Text>Contenido</Text>
        </AppModal>
      </View>
    </SafeAreaProvider>
  );
}

describe('AppModal', () => {
  beforeEach(() => {
    latestOnDismiss = null;
  });

  it('presenta un montaje recién creado tras asentarse la animación', async () => {
    const onCloseSpy = jest.fn();
    await render(<Harness onCloseSpy={onCloseSpy} />);

    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    expect(latestPresent).toHaveBeenCalledTimes(1);
  });

  it('no queda cerrado si se reabre antes de que termine la animación de cierre previa', async () => {
    const onCloseSpy = jest.fn();
    const screen = await render(<Harness onCloseSpy={onCloseSpy} />);
    expect(screen.getByText('Contenido')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('close'));
    await fireEvent.press(screen.getByTestId('reopen'));
    await act(async () => {
      latestOnDismiss?.();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('cierra normalmente cuando no se reabre antes de que termine la animación', async () => {
    const onCloseSpy = jest.fn();
    const screen = await render(<Harness onCloseSpy={onCloseSpy} />);

    await fireEvent.press(screen.getByTestId('close'));
    await act(async () => {
      latestOnDismiss?.();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  it('notifica el cierre cuando se cierra por gesto sin que el padre lo pidiera antes', async () => {
    const onCloseSpy = jest.fn();
    const screen = await render(<Harness onCloseSpy={onCloseSpy} />);

    await act(async () => {
      latestOnDismiss?.();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Contenido')).toBeNull();
  });
});
