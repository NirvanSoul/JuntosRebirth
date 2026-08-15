import 'react-native-gesture-handler/jestSetup';

// Fija la zona horaria de las pruebas a una zona al oeste de UTC y sin horario
// de verano (America/Bogota). Así los tests de fecha local no dependen de la
// zona de la máquina ni del mes: en CI (TZ=UTC), una implementación basada en
// toISOString() devolvería la misma clave y el test de hora tardía no
// protegería. El cambio en tiempo de ejecución afecta a los Date posteriores.
process.env.TZ = 'America/Bogota';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { FlatList, ScrollView, TextInput, View } =
    jest.requireActual('react-native');

  const BottomSheetModal = React.forwardRef(
    (
      {
        children,
        onDismiss,
      }: { children: React.ReactNode; onDismiss?: () => void },
      ref: React.ForwardedRef<{
        present: () => void;
        dismiss: () => void;
      }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: () => onDismiss?.(),
      }));
      return React.createElement(View, null, children);
    },
  );
  BottomSheetModal.displayName = 'BottomSheetModalMock';

  return {
    BottomSheetBackdrop: View,
    BottomSheetFlatList: FlatList,
    BottomSheetScrollView: ScrollView,
    BottomSheetModal,
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    BottomSheetTextInput: TextInput,
    BottomSheetView: View,
  };
});

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));
