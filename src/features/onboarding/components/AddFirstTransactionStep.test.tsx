import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
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

    fireEvent.press(screen.getByTestId('floating-create-button'));

    await waitFor(() => {
      expect(screen.getByText('¿Qué quieres crear?')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Crear ingreso'));

    await waitFor(() => {
      expect(screen.getByTestId('create-transaction-modal')).toBeTruthy();
    });

    expect(screen.getByText('Bs.')).toBeTruthy();
    expect(screen.queryByText('€')).toBeNull();
  });

  it('bloquea la apertura mientras isReady es false y tras la llegada tardía abre directamente en VES', async () => {
    let notifyPreferencesReady: () => void = () => {};

    function TestContainer() {
      const [ready, setReady] = useState(false);
      notifyPreferencesReady = () => setReady(true);

      mockUseCurrencyPreferences.mockReturnValue({
        activeCurrencies: ready ? ['VES'] : ['EUR'],
        isReady: ready,
        preferences: { currencies: ready ? ['VES'] : ['EUR'] },
        setCurrencyPreferences: jest.fn(),
        error: null,
      });

      return (
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, right: 0, bottom: 34, left: 0 },
          }}
        >
          <ThemeProvider initialAppearance="light">
            <AddFirstTransactionStep
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
        </SafeAreaProvider>
      );
    }

    // 1. Inicialmente las preferencias no están listas (isReady = false, valor provisional EUR)
    const screen = await render(<TestContainer />);

    // 2. Mientras no hay moneda definitiva, el FAB queda oculto también para
    // lectores de pantalla y no puede abrir el menú.
    expect(screen.queryByRole('button', { name: 'Crear' })).toBeNull();

    // No se muestra ningún menú antes de que carguen las preferencias.
    expect(screen.queryByTestId('create-transaction-modal')).toBeNull();

    // 3. Llegada tardía de preferencias: isReady = true con VES
    await act(async () => {
      notifyPreferencesReady();
    });

    // 4. El botón queda habilitado
    expect(screen.getByRole('button', { name: 'Crear' })).toBeTruthy();

    // 5. Al pulsar el botón habilitado, abre directamente en VES
    fireEvent.press(screen.getByTestId('floating-create-button'));

    await waitFor(() => {
      expect(screen.getByText('¿Qué quieres crear?')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Crear ingreso'));

    await waitFor(() => {
      expect(screen.getByTestId('create-transaction-modal')).toBeTruthy();
    });

    expect(screen.getByText('Bs.')).toBeTruthy();
    expect(screen.queryByText('€')).toBeNull();
  });

  it('en el paso de gasto solo habilita el gasto dentro del menú', async () => {
    mockUseCurrencyPreferences.mockReturnValue({
      activeCurrencies: ['EUR'],
      isReady: true,
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
            currentStep={8}
            onBack={jest.fn()}
            onSaved={jest.fn()}
            spaceId="personal"
            spaceName="Personal"
            subtitle="Registra lo que gastas"
            testID="add-first-expense-step"
            title="Tu primer gasto"
            type="expense"
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('floating-create-button'));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Crear ingreso').props.accessibilityState,
      ).toMatchObject({
        disabled: true,
      });
      expect(
        screen.getByLabelText('Crear categoría').props.accessibilityState,
      ).toMatchObject({
        disabled: true,
      });
      expect(
        screen.getByLabelText('Crear gasto').props.accessibilityState,
      ).toMatchObject({
        disabled: false,
      });
    });

    fireEvent.press(screen.getByLabelText('Crear gasto'));
    await waitFor(() => {
      expect(
        screen.getByTestId('transaction-type-indicator-expense'),
      ).toBeTruthy();
    });
  });
});
