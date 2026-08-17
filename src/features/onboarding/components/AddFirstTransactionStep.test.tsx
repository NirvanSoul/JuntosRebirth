import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddFirstTransactionStep } from '@/features/onboarding/components/AddFirstTransactionStep';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockUseCurrencyPreferences = jest.fn();

jest.mock('@/state/appPreferences/useCurrencyPreferences', () => ({
  useCurrencyPreferences: () => mockUseCurrencyPreferences(),
}));

jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  listLocalCategories: jest.fn(async () => [
    {
      id: 'cat-salary',
      spaceId: 'personal',
      name: 'Salario',
      icon: 'money',
      colorToken: 'yellow',
      isDefault: true,
      isArchived: false,
    },
  ]),
  createLocalCategories: jest.fn(async () => []),
  createLocalCategory: jest.fn(async () => ({})),
}));

jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    createLocalTransaction: jest.fn(async () => []),
  }),
);

describe('AddFirstTransactionStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('abre el modal con la moneda cargada desde las preferencias (VES)', async () => {
    mockUseCurrencyPreferences.mockReturnValue({
      activeCurrencies: ['VES'],
      isReady: true,
      preferences: { currencies: ['VES'] },
      setCurrencyPreferences: jest.fn(),
      error: null,
    });

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <AddFirstTransactionStep
            actionLabel="Añadir primer ingreso"
            currentStep={4}
            onBack={jest.fn()}
            onSaved={jest.fn()}
            spaceId="personal"
            spaceName="Personal"
            subtitle="Registra lo que ganas"
            testID="add-first-income-step"
            title="Tu primer ingreso"
            type="income"
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByText('Añadir primer ingreso'));

    await waitFor(() => {
      expect(screen.getByTestId('create-transaction-modal')).toBeTruthy();
    });

    expect(screen.getByText('Bs.')).toBeTruthy();
    expect(screen.queryByText('€')).toBeNull();
  });

  it('no abre el modal antes de que isReady sea true, protegiendo contra la carrera de reinicio de draft', async () => {
    // 1. Inicialmente las preferencias están cargando (isReady = false)
    mockUseCurrencyPreferences.mockReturnValue({
      activeCurrencies: ['EUR'],
      isReady: false,
      preferences: { currencies: ['EUR'] },
      setCurrencyPreferences: jest.fn(),
      error: null,
    });

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <AddFirstTransactionStep
            actionLabel="Añadir primer ingreso"
            currentStep={4}
            onBack={jest.fn()}
            onSaved={jest.fn()}
            spaceId="personal"
            spaceName="Personal"
            subtitle="Registra lo que ganas"
            testID="add-first-income-step"
            title="Tu primer ingreso"
            type="income"
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    // Intentar abrir el modal antes de que esté listo
    fireEvent.press(screen.getByText('Añadir primer ingreso'));

    // El modal no debe haberse abierto
    expect(screen.queryByTestId('create-transaction-modal')).toBeNull();
  });
});
