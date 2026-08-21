import { fireEvent, render, within } from '@testing-library/react-native';

import type { MoneyAccount } from '@/features/accounts/types';
import { AccountDonutChart } from '@/features/activity/components/AccountDonutChart';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';

const testAccounts: MoneyAccount[] = [
  {
    id: 'bank',
    spaceId: 'space-1',
    name: 'Cuenta nómina',
    kind: 'bank',
    icon: 'bank',
    colorToken: 'blue',
    balances: [{ currency: 'USD', openingBalanceMinor: 0 }],
    isArchived: false,
  },
  {
    id: 'cash',
    spaceId: 'space-1',
    name: 'Efectivo',
    kind: 'cash',
    icon: 'money',
    colorToken: 'emerald',
    balances: [{ currency: 'USD', openingBalanceMinor: 0 }],
    isArchived: false,
  },
];

const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const occurredOn = `${currentMonthKey}-10`;

function createTransaction(
  overrides: Partial<SessionTransaction> = {},
): SessionTransaction {
  return {
    id: 'tx-1',
    createdBy: 'install-test',
    spaceId: 'space-1',
    type: 'expense',
    amountMinor: 5000,
    currency: 'USD',
    title: 'Compra',
    categoryId: 'food',
    moneyAccountId: 'bank',
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T10:00:00.000Z`,
    ...overrides,
  };
}

const testTransactions: SessionTransaction[] = [
  createTransaction({ id: 'tx-1', amountMinor: 7500 }),
  createTransaction({ id: 'tx-2', amountMinor: 2500, moneyAccountId: 'cash' }),
  createTransaction({
    id: 'tx-3',
    type: 'income',
    amountMinor: 30000,
    moneyAccountId: 'cash',
  }),
  createTransaction({ id: 'tx-4', amountMinor: 90000, currency: 'VES' }),
  createTransaction({
    id: 'tx-5',
    amountMinor: 4000,
    moneyAccountId: undefined,
  }),
];

function renderChart(
  props: Partial<React.ComponentProps<typeof AccountDonutChart>> = {},
) {
  return render(
    <ThemeProvider initialAppearance="light">
      <AccountDonutChart
        accounts={testAccounts}
        currency="USD"
        transactions={testTransactions}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('AccountDonutChart', () => {
  it('reparte los gastos del mes entre las cuentas de la moneda recibida', async () => {
    const screen = await renderChart();
    const chart = screen.getByTestId('account-donut-chart');

    // 75 $ en la cuenta y 25 $ en efectivo: ni los 900 Bs. ni el gasto sin
    // cuenta entran en el total.
    expect(within(chart).getByText(/^\$\s*100$/)).toBeTruthy();
    expect(within(chart).getByText('Cuenta nómina · 75%')).toBeTruthy();
    expect(within(chart).getByText('Efectivo · 25%')).toBeTruthy();
    expect(
      within(chart).getByTestId('account-donut-segment-bank', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
  });

  it('alterna a ingresos y reparte solo las cuentas que ingresaron', async () => {
    const screen = await renderChart();
    const chart = screen.getByTestId('account-donut-chart');

    await fireEvent.press(within(chart).getByRole('tab', { name: 'Ingresos' }));

    expect(within(chart).getByText('Efectivo · 100%')).toBeTruthy();
    expect(within(chart).getByText(/^\$\s*300$/)).toBeTruthy();
    expect(within(chart).getByText('Total ingresado')).toBeTruthy();
  });

  it('abre el detalle de la cuenta desde su badge de leyenda', async () => {
    const onOpenMoneyAccountDetail = jest.fn();
    const screen = await renderChart({ onOpenMoneyAccountDetail });

    await fireEvent.press(
      within(screen.getByTestId('account-donut-chart')).getByRole('button', {
        name: 'Abrir detalle de Cuenta nómina, 75%',
      }),
    );

    expect(onOpenMoneyAccountDetail).toHaveBeenCalledWith('bank');
  });

  it('al retroceder de mes deja de repartir los movimientos del mes actual', async () => {
    const screen = await renderChart();
    const chart = screen.getByTestId('account-donut-chart');

    await fireEvent.press(
      within(chart).getByRole('button', { name: 'Ver mes anterior' }),
    );

    expect(
      within(chart).getByText(
        'Para ver gastos por cuenta, registra un gasto y asócialo a una cuenta.',
      ),
    ).toBeTruthy();
  });
});
