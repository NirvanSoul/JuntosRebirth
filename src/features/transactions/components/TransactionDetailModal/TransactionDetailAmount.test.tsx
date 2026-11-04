import { fireEvent, waitFor } from '@testing-library/react-native';

import { getVenezuelaRatesAt } from '@/features/exchangeRates/gateways/juntossVenezuelaRateHistoryGateway';
import { TransactionDetailAmount } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailAmount';
import type { SessionTransaction } from '@/features/transactions/types';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';

jest.mock(
  '@/features/exchangeRates/gateways/juntossVenezuelaRateHistoryGateway',
  () => ({
    getFirstVenezuelaRateDate: jest.fn(async () => '2026-01-02'),
    getVenezuelaRatesAt: jest.fn(),
  }),
);

const transaction: SessionTransaction = {
  id: 'salary',
  createdBy: 'user-1',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 500,
  currency: 'USD',
  title: 'Salario',
  categoryId: 'salary',
  occurredOn: '2026-09-11',
  recurrence: 'once',
  updatedAt: '2026-11-04T12:00:00.000Z',
  accountingAmountMinorUsd: 500,
  exchangeSnapshot: {
    countryCode: 'VE',
    createdWithCurrency: 'USD',
    rates: {
      BCV: {
        baseCurrency: 'USD',
        quoteCurrency: 'VES',
        rate: '893.2173',
        convertedAmountMinor: 446_609,
        convertedCurrency: 'VES',
        observedAt: '2026-11-04T04:00:00.000Z',
      },
    },
  },
};

describe('TransactionDetailAmount › tasa de otro día', () => {
  it('muestra la fecha como botón y valora el importe con las tasas de hoy', async () => {
    jest.mocked(getVenezuelaRatesAt).mockResolvedValue({
      bcvUsd: '900',
      bcvEur: '1000',
      usdt: null,
    });
    const screen = await renderWithTheme(
      <TransactionDetailAmount
        accentColor="#00CD5C"
        mode="VES_BCV"
        onPress={jest.fn()}
        transaction={transaction}
      />,
    );

    const dateButton = screen.getByTestId(
      'transaction-detail-rate-date-button',
    );
    expect(
      screen.getByTestId('transaction-detail-rate-badge'),
    ).toHaveTextContent(/4\.466,09/);

    await fireEvent.press(dateButton);
    await fireEvent.press(screen.getByTestId('rate-date-today'));

    expect(getVenezuelaRatesAt).toHaveBeenCalledWith(
      getLocalTodayKey(),
      undefined,
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('transaction-detail-rate-badge'),
      ).toHaveTextContent(/4\.500/),
    );
    expect(screen.getByText(/1 \$ BCV = Bs 900,00/)).toBeTruthy();
    // Solo la fecha se tiñe: el importe conserva su color.
    expect(
      screen.getByTestId('transaction-detail-rate-date-button'),
    ).toHaveStyle({ borderColor: colors.cta });
    expect(screen.getByTestId('transaction-detail-rate-badge')).not.toHaveStyle(
      { color: colors.cta },
    );
  });
});
