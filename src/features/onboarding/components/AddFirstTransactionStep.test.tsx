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

    fireEvent.press(
      screen.getByRole('button', { name: 'Añadir primer ingreso' }),
    );

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
        </SafeAreaProvider>
      );
    }

    // 1. Inicialmente las preferencias no están listas (isReady = false, valor provisional EUR)
    const screen = await render(<TestContainer />);

    // 2. El botón refleja estado deshabilitado
    const initialButton = screen.getByRole('button', {
      name: 'Añadir primer ingreso',
    });
    expect(initialButton.props.accessibilityState).toMatchObject({
      disabled: true,
    });

    // Pulsar el botón antes de que carguen las preferencias no abre el modal
    fireEvent.press(initialButton);
    expect(screen.queryByTestId('create-transaction-modal')).toBeNull();

    // 3. Llegada tardía de preferencias: isReady = true con VES
    await act(async () => {
      notifyPreferencesReady();
    });

    // 4. El botón queda habilitado
    const updatedButton = screen.getByRole('button', {
      name: 'Añadir primer ingreso',
    });
    expect(updatedButton.props.accessibilityState).toMatchObject({
      disabled: false,
    });

    // 5. Al pulsar el botón habilitado, abre directamente en VES
    fireEvent.press(updatedButton);

    await waitFor(() => {
      expect(screen.getByTestId('create-transaction-modal')).toBeTruthy();
    });

    expect(screen.getByText('Bs.')).toBeTruthy();
    expect(screen.queryByText('€')).toBeNull();
  });
});
