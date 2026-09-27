import { fireEvent, waitFor } from '@testing-library/react-native';

import type { MoneyAccount } from '@/features/accounts/types';
import { CurrencyExchangeModal } from '@/features/exchangeRates/components/CurrencyExchangeModal/CurrencyExchangeModal';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/exchangeRates/hooks/useExchangeRates');

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

const mockedUseExchangeRates = jest.mocked(useExchangeRates);

const successRates = {
  status: 'success' as const,
  rates: {
    rates: {
      BCV: {
        source: 'BCV' as const,
        baseCurrency: 'USD' as const,
        quoteCurrency: 'VES' as const,
        rate: '40.0000000000',
        observedAt: '2026-09-22T19:00:00.000Z',
        fetchedAt: '2026-09-22T19:05:00.000Z',
      },
      EURO: {
        source: 'EURO' as const,
        baseCurrency: 'EUR' as const,
        quoteCurrency: 'VES' as const,
        rate: '50.0000000000',
        observedAt: '2026-09-22T19:00:00.000Z',
        fetchedAt: '2026-09-22T19:05:00.000Z',
      },
    },
    ratesUpdatedAt: '2026-09-22T19:05:00.000Z',
    stale: false,
  },
};

const accounts: MoneyAccount[] = [
  {
    id: 'bank',
    spaceId: 'space-1',
    name: 'Banco Venezuela',
    kind: 'bank',
    icon: 'bank',
    colorToken: 'blue',
    balances: [{ currency: 'USD', openingBalanceMinor: 0 }],
    isArchived: false,
  },
];

type Screen = Awaited<ReturnType<typeof renderWithTheme>>;

async function renderModal(
  overrides: Partial<React.ComponentProps<typeof CurrencyExchangeModal>> = {},
) {
  const onSubmit = jest.fn(async () => true);
  const onClose = jest.fn();
  const screen = await renderWithTheme(
    <CurrencyExchangeModal
      moneyAccounts={[]}
      onClose={onClose}
      onSubmit={onSubmit}
      visible
      {...overrides}
    />,
  );

  return { onClose, onSubmit, screen };
}

async function typeKeys(screen: Screen, keys: string) {
  for (const key of keys) {
    await fireEvent.press(screen.getByLabelText(key));
  }
}

function amountOf(screen: Screen, role: 'give' | 'receive') {
  return screen.getByTestId(`currency-exchange-${role}-amount-value`).props
    .children;
}

describe('CurrencyExchangeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseExchangeRates.mockReturnValue(successRates);
  });

  it('empieza comprando dólares, con lo que entregas activo y BCV', async () => {
    const { screen } = await renderModal();

    expect(screen.getByText('Entregas bolívares')).toBeTruthy();
    expect(screen.getByText('Recibes dólares')).toBeTruthy();
    expect(
      screen.getByLabelText('Entregas bolívares, sin importe').props
        .accessibilityState,
    ).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Bolívares por dólar: 40')).toBeTruthy();
    expect(screen.queryByTestId('currency-exchange-rate-notice')).toBeNull();
    expect(screen.getByTestId('amount-keypad')).toBeTruthy();
    expect(screen.queryByLabelText('Sumar')).toBeNull();
    expect(
      screen.getByTestId('currency-exchange-submit-button').props
        .accessibilityState,
    ).toMatchObject({ disabled: true });

    await typeKeys(screen, '500');

    expect(amountOf(screen, 'give')).toBe('500');
    expect(amountOf(screen, 'receive')).toBe('12,5');
    expect(
      screen.getByTestId('currency-exchange-submit-button').props
        .accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('deriva los bolívares al escribir dólares en el bloque que recibes', async () => {
    const { screen } = await renderModal();

    await fireEvent.press(
      screen.getByLabelText('Recibes dólares, sin importe'),
    );
    await typeKeys(screen, '10');

    expect(amountOf(screen, 'receive')).toBe('10');
    expect(amountOf(screen, 'give')).toBe('400');
  });

  it('mantiene la fuente y recalcula al escribir en el otro bloque', async () => {
    const { screen } = await renderModal();

    await fireEvent.press(
      screen.getByLabelText('Recibes dólares, sin importe'),
    );
    await typeKeys(screen, '10');
    // La primera tecla sobre el otro bloque sustituye el 400 sugerido: la
    // persona pasa a calcular cuántos dólares compra con esos bolívares.
    await fireEvent.press(screen.getByLabelText('Entregas bolívares: 400'));
    await typeKeys(screen, '450');

    expect(amountOf(screen, 'give')).toBe('450');
    expect(amountOf(screen, 'receive')).toBe('11,25');
    expect(screen.getByLabelText('Bolívares por dólar: 40')).toBeTruthy();
    expect(
      screen.getByLabelText('$ BCV').props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('editar la tasa del BCV la convierte en personalizada y recalcula', async () => {
    const { screen } = await renderModal();

    await typeKeys(screen, '400');
    await fireEvent.press(screen.getByLabelText('Bolívares por dólar: 40'));
    await typeKeys(screen, '50');

    expect(screen.getByLabelText('Bolívares por dólar: 50')).toBeTruthy();
    expect(
      screen.getByLabelText('Personalizada').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(amountOf(screen, 'give')).toBe('400');
    expect(amountOf(screen, 'receive')).toBe('8');
  });

  it('la flecha intercambia los lados y envía gasto en USD e ingreso en VES', async () => {
    const { onSubmit, screen } = await renderModal();

    await fireEvent.press(
      screen.getByLabelText('Recibes dólares, sin importe'),
    );
    await typeKeys(screen, '10');
    await fireEvent.press(
      screen.getByLabelText('Intercambiar entregas y recibes'),
    );

    expect(screen.getByLabelText('Entregas dólares: 10')).toBeTruthy();
    expect(screen.getByLabelText('Recibes bolívares: 400')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Registrar venta de dólares'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        operation: 'SELL_USD',
        expense: {
          amountMinor: 1_000,
          currency: 'USD',
          moneyAccountId: undefined,
        },
        income: {
          amountMinor: 40_000,
          currency: 'VES',
          moneyAccountId: undefined,
        },
      }),
    );
  });

  it('borra con la tecla de retroceso en el bloque activo', async () => {
    const { screen } = await renderModal();

    await typeKeys(screen, '500');
    await fireEvent.press(screen.getByLabelText('Borrar'));

    expect(amountOf(screen, 'give')).toBe('50');
    expect(amountOf(screen, 'receive')).toBe('1,25');
  });

  it('permite elegir una cuenta distinta por lado desde el botón de cada importe', async () => {
    const { onSubmit, screen } = await renderModal({ moneyAccounts: accounts });

    await fireEvent.press(screen.getByTestId('currency-exchange-give-account'));
    await fireEvent.press(screen.getByLabelText('Banco Venezuela · USD'));
    await fireEvent.press(screen.getByLabelText('Guardar cuenta'));

    expect(screen.getByLabelText('Cuenta: Banco Venezuela')).toBeTruthy();
    expect(screen.getByLabelText('Cuenta: ninguna')).toBeTruthy();

    await typeKeys(screen, '400');
    await fireEvent.press(screen.getByLabelText('Registrar compra de dólares'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'BUY_USD',
          expense: {
            amountMinor: 40_000,
            currency: 'VES',
            moneyAccountId: 'bank',
          },
        }),
      ),
    );
  });

  it('no ofrece cuentas cuando el espacio no tiene ninguna', async () => {
    const { screen } = await renderModal();

    expect(screen.queryByLabelText('Cuenta: ninguna')).toBeNull();
  });

  it('cambia a la tasa EUR y recalcula', async () => {
    const { screen } = await renderModal();

    await fireEvent.press(
      screen.getByLabelText('Recibes dólares, sin importe'),
    );
    await typeKeys(screen, '10');
    await fireEvent.press(screen.getByText('€ BCV'));

    expect(amountOf(screen, 'give')).toBe('500');
    expect(screen.getByLabelText('Bolívares por dólar: 50')).toBeTruthy();
  });

  it('sin tasa del backend solo deja la personalizada, editable con el teclado', async () => {
    mockedUseExchangeRates.mockReturnValue({ status: 'error' });
    const { onSubmit, screen } = await renderModal();

    expect(screen.queryByTestId('currency-exchange-rate-source')).toBeNull();
    expect(
      screen.getByTestId('currency-exchange-rate-notice'),
    ).toHaveTextContent(
      'No pudimos leer la tasa del BCV. Escribe la que aplicaste.',
    );

    await fireEvent.press(screen.getByLabelText('Bolívares por dólar'));
    await typeKeys(screen, '55');
    await fireEvent.press(
      screen.getByLabelText('Recibes dólares, sin importe'),
    );
    await typeKeys(screen, '2');

    expect(amountOf(screen, 'give')).toBe('110');

    await fireEvent.press(screen.getByLabelText('Registrar compra de dólares'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          expense: expect.objectContaining({ amountMinor: 11_000 }),
        }),
      ),
    );
  });

  it('mantiene los datos cuando el guardado falla', async () => {
    const onSubmit = jest.fn(async () => false);
    const { screen } = await renderModal({ onSubmit });

    await typeKeys(screen, '500');
    await fireEvent.press(screen.getByLabelText('Registrar compra de dólares'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(amountOf(screen, 'give')).toBe('500');
    expect(
      screen.getByTestId('currency-exchange-submit-button').props
        .accessibilityState,
    ).toMatchObject({ disabled: false });
  });
});
