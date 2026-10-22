import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render } from '@testing-library/react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import {
  CurrencySymbolPreferenceProvider,
  useCurrencySymbolPreference,
} from '@/state/appPreferences/CurrencySymbolPreferenceProvider';
import { saveCurrencySymbolPreference } from '@/state/appPreferences/currencySymbolPreferenceRepository';

let latestOnDismiss: (() => void) | null = null;
let latestOnChange: ((index: number) => void) | null = null;
let mockLatestPresent = jest.fn();
let mockLatestDismiss = jest.fn();
let latestBackdropDisappearsOnIndex: number | undefined;

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const {
    CurrencySymbolPreferenceScope,
    defaultCurrencySymbolPreferenceContextValue,
  } = jest.requireActual(
    '@/state/appPreferences/CurrencySymbolPreferenceProvider',
  );

  const BottomSheetModal = React.forwardRef(
    (
      {
        backdropComponent,
        backgroundStyle,
        children,
        onChange,
        onDismiss,
      }: {
        backdropComponent?: (props: object) => ReactNode;
        backgroundStyle?: object;
        children?: ReactNode;
        onChange?: (index: number) => void;
        onDismiss?: () => void;
      },
      ref: React.ForwardedRef<{ present: () => void; dismiss: () => void }>,
    ) => {
      React.useEffect(() => {
        latestOnDismiss = onDismiss ?? null;
        latestOnChange = onChange ?? null;
      });
      React.useImperativeHandle(ref, () => ({
        present: mockLatestPresent,
        dismiss: mockLatestDismiss,
      }));
      return (
        <CurrencySymbolPreferenceScope
          value={defaultCurrencySymbolPreferenceContextValue}
        >
          <View style={backgroundStyle} testID="bottom-sheet">
            {backdropComponent?.({})}
            {children}
          </View>
        </CurrencySymbolPreferenceScope>
      );
    },
  );
  BottomSheetModal.displayName = 'BottomSheetModalMock';

  return {
    BottomSheetModal,
    BottomSheetView: ({ children }: { children?: ReactNode }) => (
      <View>{children}</View>
    ),
    BottomSheetBackdrop: ({
      disappearsOnIndex,
    }: {
      disappearsOnIndex?: number;
    }) => {
      latestBackdropDisappearsOnIndex = disappearsOnIndex;
      return null;
    },
  };
});

jest.mock('expo-blur', () => ({ BlurView: () => null }));

function ModalCurrencyAmount() {
  const { formatCurrency } = useCurrencySymbolPreference();
  return <Text>{formatCurrency(100_000, 'EUR', 'es-ES')}</Text>;
}

function Harness({
  backgroundVariant,
  initialVisible = true,
  onCloseSpy,
  onDismissedSpy,
}: {
  backgroundVariant?: 'surface' | 'modal' | 'background';
  initialVisible?: boolean;
  onCloseSpy: () => void;
  onDismissedSpy?: () => void;
}) {
  const [visible, setVisible] = useState(initialVisible);
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
      <ThemeProvider initialAppearance="light">
        <View>
          <Pressable onPress={close} testID="close" />
          <Pressable onPress={() => setVisible(true)} testID="reopen" />
          <AppModal
            backgroundVariant={backgroundVariant}
            onClose={close}
            onDismissed={onDismissedSpy}
            visible={visible}
          >
            <Text>Contenido</Text>
          </AppModal>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('AppModal', () => {
  beforeEach(() => {
    latestOnDismiss = null;
    latestOnChange = null;
    mockLatestPresent = jest.fn();
    mockLatestDismiss = jest.fn();
    latestBackdropDisappearsOnIndex = undefined;
    return AsyncStorage.clear();
  });

  it('presenta la hoja inmediatamente cuando cambia a visible', async () => {
    const onCloseSpy = jest.fn();
    const screen = await render(
      <Harness initialVisible={false} onCloseSpy={onCloseSpy} />,
    );

    expect(mockLatestPresent).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('reopen'));

    expect(mockLatestPresent).toHaveBeenCalledTimes(1);
  });

  it('puede usar el fondo de la aplicación para formularios que mantienen controles claros', async () => {
    const screen = await render(
      <Harness backgroundVariant="background" onCloseSpy={jest.fn()} />,
    );

    expect(
      StyleSheet.flatten(screen.getByTestId('bottom-sheet').props.style)
        .backgroundColor,
    ).toBe(colors.background);
  });

  it('desactiva el backdrop antes del índice cerrado para que no bloquee toques', async () => {
    await render(<Harness onCloseSpy={jest.fn()} />);

    expect(latestBackdropDisappearsOnIndex).toBe(-0.99);
  });

  it('conserva la preferencia de símbolos dentro del portal del modal', async () => {
    await saveCurrencySymbolPreference('account-1', {
      showCurrencySymbols: false,
    });
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <CurrencySymbolPreferenceProvider accountId="account-1">
            <AppModal onClose={jest.fn()} visible>
              <ModalCurrencyAmount />
            </AppModal>
          </CurrencySymbolPreferenceProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(await screen.findByText('1.000')).toBeTruthy();
    expect(screen.queryByText(/€/)).toBeNull();
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
    // Apertura inicial, reapertura inmediata y la repetición tras el cierre.
    expect(mockLatestPresent).toHaveBeenCalledTimes(3);
  });

  it('vuelve a abrirse aunque la librería descarte el cierre sin avisar', async () => {
    const onCloseSpy = jest.fn();
    const screen = await render(<Harness onCloseSpy={onCloseSpy} />);

    // El cierre pedido por el padre nunca emite `onDismiss`.
    await fireEvent.press(screen.getByTestId('close'));
    await fireEvent.press(screen.getByTestId('reopen'));

    expect(mockLatestPresent).toHaveBeenCalledTimes(2);

    await act(async () => {
      latestOnChange?.(0);
    });
    // Un cierre posterior por gesto ya no se confunde con el cierre perdido.
    await act(async () => {
      latestOnDismiss?.();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(2);
    expect(mockLatestPresent).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  it('cierra normalmente cuando no se reabre antes de que termine la animación', async () => {
    const onCloseSpy = jest.fn();
    const onDismissedSpy = jest.fn();
    const screen = await render(
      <Harness onCloseSpy={onCloseSpy} onDismissedSpy={onDismissedSpy} />,
    );

    await fireEvent.press(screen.getByTestId('close'));
    expect(onDismissedSpy).not.toHaveBeenCalled();
    await act(async () => {
      latestOnDismiss?.();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(onDismissedSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  it('vuelve a cerrar la hoja si queda abierta después de que el padre la cerró', async () => {
    const onCloseSpy = jest.fn();
    const onDismissedSpy = jest.fn();
    const screen = await render(
      <Harness onCloseSpy={onCloseSpy} onDismissedSpy={onDismissedSpy} />,
    );

    await fireEvent.press(screen.getByTestId('close'));
    expect(mockLatestDismiss).toHaveBeenCalledTimes(1);

    // El primer cierre se perdió y la hoja terminó de abrirse igualmente.
    await act(async () => {
      latestOnChange?.(0);
    });
    expect(mockLatestDismiss).toHaveBeenCalledTimes(2);

    await act(async () => {
      latestOnDismiss?.();
    });
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(onDismissedSpy).toHaveBeenCalledTimes(1);
    expect(mockLatestPresent).toHaveBeenCalledTimes(1);
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
