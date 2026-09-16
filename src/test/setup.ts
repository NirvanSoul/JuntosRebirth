import 'react-native-gesture-handler/jestSetup';

// Fija la zona horaria de las pruebas a una zona al oeste de UTC y sin horario
// de verano (America/Bogota). Así los tests de fecha local no dependen de la
// zona de la máquina ni del mes: en CI (TZ=UTC), una implementación basada en
// toISOString() devolvería la misma clave y el test de hora tardía no
// protegería. El cambio en tiempo de ejecución afecta a los Date posteriores.
process.env.TZ = 'America/Bogota';
process.env.EXPO_PUBLIC_API_URL ??= 'https://api.example.test';

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

/**
 * Better Auth se distribuye como ESM y arrastra un árbol de dependencias que
 * Jest tendría que transformar en cada prueba. Ninguna prueba unitaria quiere
 * un cliente de red real, así que se sustituye por un doble: quien necesite
 * una respuesta concreta la programa con `mockResolvedValue`.
 */
jest.mock('@/lib/auth-client', () => {
  const ok = () => jest.fn(async () => ({ data: null, error: null }));
  return {
    authClient: {
      emailOtp: {
        checkVerificationOtp: ok(),
        resetPassword: ok(),
        sendVerificationOtp: ok(),
        verifyEmail: ok(),
      },
      getCookie: jest.fn(async () => ''),
      getSession: ok(),
      hydrateSession: jest.fn(),
      signIn: { email: ok(), social: ok() },
      signOut: ok(),
      signUp: { email: ok() },
      useSession: jest.fn(() => ({
        data: null,
        error: null,
        isPending: false,
      })),
    },
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({
      data: {
        idToken: 'mock-google-id-token',
        user: { email: 'user@example.com', name: 'Test User' },
      },
    })),
    signOut: jest.fn(async () => null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  },
}));

// El módulo nativo de red no existe en Jest: por defecto el dispositivo está
// conectado y nadie escucha cambios. Quien pruebe la desconexión lo sustituye.
jest.mock('expo-web-browser', () => ({
  coolDownAsync: jest.fn(async () => ({})),
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
  warmUpAsync: jest.fn(async () => ({})),
}));

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: jest.fn(async () => {}),
  openDatabaseAsync: jest.fn(async () => ({
    closeAsync: jest.fn(async () => {}),
    execAsync: jest.fn(async () => {}),
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
    withExclusiveTransactionAsync: jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          execAsync: jest.fn(async () => {}),
          getFirstAsync: jest.fn(async () => null),
          getAllAsync: jest.fn(async () => []),
          runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
        }),
    ),
  })),
}));
