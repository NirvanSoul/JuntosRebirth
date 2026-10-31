import { fireEvent, within } from '@testing-library/react-native';
import {
  type MeasureInWindowOnSuccessCallback,
  StyleSheet,
  View,
} from 'react-native';

import { PreviewActionsContext } from '@/components/overlays/PreviewActions/previewActions';
import { TransactionPeriodModal } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import type { SessionTransaction } from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';
import { fontFamily } from '@/theme/fonts';
import { typography } from '@/theme/typography';

import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

jest.mock('@/features/profile/hooks/useCurrencyCapabilities');
jest.mock('@/features/exchangeRates/hooks/useExchangeRates');

function transaction(
  id: string,
  type: 'expense' | 'income',
  amountMinor: number,
  occurredOn: string,
  currency: CurrencyCode = 'EUR',
  exchangeSnapshot?: SessionTransaction['exchangeSnapshot'],
): SessionTransaction {
  return {
    id,
    createdBy: 'install-test',
    spaceId: 'personal',
    categoryId: 'general',
    type,
    amountMinor,
    currency,
    title: id,
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T12:00:00.000Z`,
    exchangeSnapshot,
  };
}

const transactions: SessionTransaction[] = [
  transaction('income-july', 'income', 1200, '2026-07-10'),
  transaction('expense-july', 'expense', 400, '2026-07-12'),
  transaction('income-june', 'income', 1000, '2026-06-10'),
  transaction('expense-june', 'expense', 500, '2026-06-12'),
];

describe('TransactionPeriodModal', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-30T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.mocked(useExchangeRates).mockReturnValue({
      status: 'success',
      rates: {
        ratesUpdatedAt: '2026-07-30T10:00:00.000Z',
        stale: false,
        rates: {
          BCV: {
            baseCurrency: 'USD',
            fetchedAt: '2026-07-30T10:00:00.000Z',
            observedAt: '2026-07-30T10:00:00.000Z',
            quoteCurrency: 'VES',
            rate: '50.00',
            source: 'BCV',
          },
          EURO: {
            baseCurrency: 'EUR',
            fetchedAt: '2026-07-30T10:00:00.000Z',
            observedAt: '2026-07-30T10:00:00.000Z',
            quoteCurrency: 'VES',
            rate: '55.00',
            source: 'EURO',
          },
        },
      },
    });
    jest.mocked(useCurrencyCapabilities).mockReturnValue({
      countryCode: null,
      venezuelaCurrencyMode: false,
      customExchangeRate: false,
      multiRateMovementDisplay: false,
      allowsMultipleAccountCurrencies: true,
    });
  });

  it('deja el botón de añadir flotando sobre la lista', async () => {
    const { getByRole, getByTestId } = await renderWithTheme(
      <TransactionPeriodModal
        categories={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        transactions={transactions}
        type="expense"
        visible
      />,
    );

    expect(
      StyleSheet.flatten(
        getByRole('button', { name: 'Añadir gasto' }).props.style,
      ),
    ).toMatchObject({ position: 'absolute' });
    // El final del scroll reserva el alto del botón para el último movimiento.
    expect(
      StyleSheet.flatten(
        getByTestId('expense-period-scroll-view').props.contentContainerStyle,
      ).paddingBottom,
    ).toBeGreaterThan(0);
  });

  it('sigue bajando hacia los periodos anteriores sin cambiar el selector', async () => {
    const history = [
      ...transactions,
      transaction('expense-march', 'expense', 300, '2026-03-05'),
    ];
    const { getAllByTestId, getByTestId, queryByText } = await renderWithTheme(
      <TransactionPeriodModal
        categories={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        transactions={history}
        type="expense"
        visible
      />,
    );

    // Bajo julio siguen los movimientos de junio, sin título propio.
    const [june] = getAllByTestId('expense-period-older-section');
    expect(within(june!).getByText('expense-june')).toBeTruthy();
    expect(queryByText('Junio 2026')).toBeNull();
    expect(queryByText('expense-march')).toBeNull();

    // Al bajar, el selector fijo de arriba pasa al mes que se ve y, cerca del
    // final, se añade el siguiente con movimientos saltando los vacíos.
    const selector = getByTestId('expense-period-selector');
    const scrollView = getByTestId('expense-period-scroll-view');
    await fireEvent(scrollView, 'layout', {
      nativeEvent: { layout: { height: 600 } },
    });
    await fireEvent(june!, 'layout', { nativeEvent: { layout: { y: 400 } } });
    expect(within(selector).getByText('Julio 2026')).toBeTruthy();
    await fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: 300 },
        contentSize: { height: 1000, width: 390 },
        layoutMeasurement: { height: 600, width: 390 },
      },
    });

    expect(within(selector).getByText('Junio 2026')).toBeTruthy();
    expect(getAllByTestId('expense-period-older-section')).toHaveLength(2);
    expect(queryByText('expense-march')).toBeTruthy();
  });

  it('abre las acciones de un movimiento con una pulsación larga', async () => {
    const openPreviewActions = jest.fn();
    const { getAllByTestId } = await renderWithTheme(
      <PreviewActionsContext.Provider value={openPreviewActions}>
        <TransactionPeriodModal
          categories={[]}
          onAdd={jest.fn()}
          onClose={jest.fn()}
          transactions={transactions}
          type="expense"
          visible
        />
      </PreviewActionsContext.Provider>,
    );

    // El entorno de pruebas no mide vistas: se simula la posición en ventana.
    const measure = jest
      .spyOn(
        View.prototype as {
          measureInWindow: (callback: MeasureInWindowOnSuccessCallback) => void;
        },
        'measureInWindow',
      )
      .mockImplementation((callback) => callback(20, 400, 60, 74));
    await fireEvent(
      getAllByTestId('transaction-preview-card')[0]!,
      'longPress',
    );
    measure.mockRestore();

    expect(openPreviewActions).toHaveBeenCalledWith(
      { kind: 'transaction', id: 'expense-july' },
      expect.anything(),
      expect.any(Function),
      true,
    );
  });

  it('compara los ingresos del mes con el mes anterior', async () => {
    const { getByText } = await renderWithTheme(
      <TransactionPeriodModal
        categories={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        transactions={transactions}
        type="income"
        visible
      />,
    );

    expect(getByText('más que el mes anterior')).toBeTruthy();
    expect(getByText('2\u00a0€')).toBeTruthy();
  });

  it('compara los gastos del mes con el mes anterior', async () => {
    const { getByText } = await renderWithTheme(
      <TransactionPeriodModal
        categories={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        transactions={transactions}
        type="expense"
        visible
      />,
    );

    expect(getByText('1\u00a0€')).toBeTruthy();
    expect(getByText('menos que el mes anterior')).toBeTruthy();
  });

  it('compara el balance del mes con el mes anterior', async () => {
    const { getByText } = await renderWithTheme(
      <TransactionPeriodModal
        categories={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        transactions={transactions}
        type="balance"
        visible
      />,
    );

    expect(getByText('3\u00a0€')).toBeTruthy();
  });

  it('respeta el mes y la moneda iniciales enviados por la pantalla de origen', async () => {
    const { getByTestId, getByText } = await renderWithTheme(
      <TransactionPeriodModal
        categories={[]}
        initialCurrency="USD"
        initialDate={new Date(2026, 5, 1, 12)}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        transactions={[
          transaction('expense-eur-june', 'expense', 5000, '2026-06-10'),
          transaction('expense-usd-june', 'expense', 3000, '2026-06-12', 'USD'),
        ]}
        type="expense"
        visible
      />,
    );

    expect(getByText('Junio 2026')).toBeTruthy();
    expect(getByText('USD')).toBeTruthy();
    expect(getByTestId('expense-period-total').props.children).toContain('$');
    expect(getByText('expense-usd-june')).toBeTruthy();
    expect(() => getByText('expense-eur-june')).toThrow();
  });

  it.each(['income', 'expense', 'balance'] as const)(
    'muestra el total de %s en Gilroy Medium',
    async (type) => {
      const { getByTestId, unmount } = await renderWithTheme(
        <TransactionPeriodModal
          categories={[]}
          onAdd={jest.fn()}
          onClose={jest.fn()}
          transactions={transactions}
          type={type}
          visible
        />,
      );

      expect(
        StyleSheet.flatten(getByTestId(`${type}-period-total`).props.style),
      ).toMatchObject({
        fontFamily: fontFamily.medium,
        fontSize: typography.title.fontSize,
      });
      unmount();
    },
  );

  it('no reinterpreta movimientos de otra moneda para usuarios internacionales', async () => {
    const { getByTestId, getByText, queryByText, queryByTestId } =
      await renderWithTheme(
        <TransactionPeriodModal
          categories={[]}
          onAdd={jest.fn()}
          onClose={jest.fn()}
          transactions={[
            transaction('eur-expense', 'expense', 1_000, '2026-07-12'),
            {
              ...transaction('cop-expense', 'expense', 5_000_000, '2026-07-12'),
              currency: 'COP',
            },
          ]}
          type="expense"
          visible
        />,
      );

    // No muestra el selector de 3 tasas en modo internacional
    expect(queryByTestId('expense-period-valuation-selector')).toBeNull();
    // Muestra el botón de moneda a la derecha
    expect(getByTestId('expense-period-currency-button')).toBeTruthy();

    expect(getByTestId('expense-period-total').props.children).toContain(
      '50.000',
    );
    expect(queryByText('eur-expense')).toBeNull();
    expect(getByText('cop-expense')).toBeTruthy();
  });

  describe('modo Venezuela', () => {
    beforeEach(() => {
      jest.mocked(useCurrencyCapabilities).mockReturnValue({
        countryCode: 'VE',
        venezuelaCurrencyMode: true,
        customExchangeRate: true,
        multiRateMovementDisplay: true,
        allowsMultipleAccountCurrencies: false,
      });
    });

    it('muestra el selector de 3 tasas arriba del monto y oculta el botón de moneda de la derecha', async () => {
      const { getByTestId, queryByTestId } = await renderWithTheme(
        <TransactionPeriodModal
          categories={[]}
          onAdd={jest.fn()}
          onClose={jest.fn()}
          transactions={[
            transaction('usd-expense', 'expense', 2000, '2026-07-12', 'USD'),
            transaction('ves-expense', 'expense', 100000, '2026-07-12', 'VES', {
              countryCode: 'VE',
              createdWithCurrency: 'VES',
              rates: {
                BCV: {
                  baseCurrency: 'USD',
                  convertedAmountMinor: 2000,
                  observedAt: '2026-07-12T10:00:00.000Z',
                  quoteCurrency: 'VES',
                  rate: '50.00',
                },
                EURO: {
                  baseCurrency: 'EUR',
                  convertedAmountMinor: 1818,
                  observedAt: '2026-07-12T10:00:00.000Z',
                  quoteCurrency: 'VES',
                  rate: '55.00',
                },
              },
            }),
          ]}
          type="expense"
          visible
        />,
      );

      // Muestra el selector switchable arriba del monto
      expect(getByTestId('expense-period-valuation-selector')).toBeTruthy();
      // Oculta el botón de moneda del lado derecho
      expect(queryByTestId('expense-period-currency-button')).toBeNull();
    });

    it('cambia el monto total entre Dolar, $ BCV y € BCV y lista todos los movimientos del periodo', async () => {
      const { getByTestId, getByText } = await renderWithTheme(
        <TransactionPeriodModal
          categories={[]}
          onAdd={jest.fn()}
          onClose={jest.fn()}
          transactions={[
            transaction('usd-expense', 'expense', 2000, '2026-07-12', 'USD'),
            transaction('ves-expense', 'expense', 100000, '2026-07-12', 'VES', {
              countryCode: 'VE',
              createdWithCurrency: 'VES',
              rates: {
                BCV: {
                  baseCurrency: 'USD',
                  convertedAmountMinor: 2000,
                  observedAt: '2026-07-12T10:00:00.000Z',
                  quoteCurrency: 'VES',
                  rate: '50.00',
                },
                EURO: {
                  baseCurrency: 'EUR',
                  convertedAmountMinor: 1818,
                  observedAt: '2026-07-12T10:00:00.000Z',
                  quoteCurrency: 'VES',
                  rate: '55.00',
                },
              },
            }),
          ]}
          type="expense"
          visible
        />,
      );

      // Ambos movimientos aparecen en la lista (sin aislar por moneda)
      expect(getByText('usd-expense')).toBeTruthy();
      expect(getByText('ves-expense')).toBeTruthy();

      // Inicialmente en USD: $20 + (1000 VES / 50) = $40
      expect(getByTestId('expense-period-total').props.children).toContain(
        '40',
      );

      // Cambiar a $ BCV: $40 * 50 = 2000 VES
      await fireEvent.press(
        getByTestId('expense-period-valuation-selector-control-VES_BCV'),
      );
      jest.advanceTimersByTime(200);
      expect(getByTestId('expense-period-total').props.children).toContain(
        '2.000',
      );

      // Cambiar a € BCV: $40 * 55 = 2200 VES
      await fireEvent.press(
        getByTestId('expense-period-valuation-selector-control-EUR'),
      );
      jest.advanceTimersByTime(200);
      expect(getByTestId('expense-period-total').props.children).toContain(
        '2.200',
      );

      // Regresar a Dolar
      await fireEvent.press(
        getByTestId('expense-period-valuation-selector-control-USD'),
      );
      jest.advanceTimersByTime(200);
      expect(getByTestId('expense-period-total').props.children).toContain(
        '40',
      );
    });
  });
});
