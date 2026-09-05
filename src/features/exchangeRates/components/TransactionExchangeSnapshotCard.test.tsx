import { fireEvent, render } from '@testing-library/react-native';

import { TransactionExchangeSnapshotCard } from '@/features/exchangeRates/components/TransactionExchangeSnapshotCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

describe('TransactionExchangeSnapshotCard', () => {
  it('cambia la equivalencia desde conversiones congeladas', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <TransactionExchangeSnapshotCard
          amountMinor={1_000}
          currency="USD"
          exchangeSnapshot={{
            countryCode: 'VE',
            createdWithCurrency: 'USD',
            rates: {
              BCV: {
                baseCurrency: 'USD',
                quoteCurrency: 'VES',
                rate: '50',
                convertedAmountMinor: 50_000,
                convertedCurrency: 'VES',
                observedAt: '2026-09-05T04:00:00.000Z',
              },
              EURO: {
                baseCurrency: 'USD',
                quoteCurrency: 'VES',
                rate: '60',
                convertedAmountMinor: 60_000,
                convertedCurrency: 'VES',
                observedAt: '2026-09-05T04:00:00.000Z',
              },
            },
          }}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByTestId('transaction-detail-rate-badge').props.children,
    ).toBe('$ 10');

    await fireEvent.press(
      screen.getByTestId(
        'transaction-detail-display-mode-selector-control-VES_BCV',
      ),
    );
    expect(
      screen.getByTestId('transaction-detail-rate-badge').props.children,
    ).toBe('Bs. 500');
    expect(screen.getByText(/BCV.*5 sept/i)).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId(
        'transaction-detail-display-mode-selector-control-EUR',
      ),
    );
    expect(
      screen.getByTestId('transaction-detail-rate-badge').props.children,
    ).toBe('Bs. 600');
    expect(screen.getByText(/Tasa EUR.*5 sept/i)).toBeTruthy();
  });
});
