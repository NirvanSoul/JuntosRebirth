import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

    expect(getByText('vs. mes anterior')).toBeTruthy();
    expect(getByText('20%')).toBeTruthy();
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

    expect(getByText('20%')).toBeTruthy();
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

    expect(getByText('60%')).toBeTruthy();
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
