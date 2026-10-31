import { fireEvent, within } from '@testing-library/react-native';

import { CategoryDonutChart } from '@/features/activity/components/CategoryDonutChart';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';

const testCategories: Category[] = [
  {
    id: 'food',
    spaceId: 'space-1',
    name: 'Comida',
    icon: 'fork-knife',
    colorToken: 'orange',
    isDefault: false,
    isArchived: false,
  },
  {
    id: 'transport',
    spaceId: 'space-1',
    name: 'Transporte',
    icon: 'car',
    colorToken: 'blue',
    isDefault: false,
    isArchived: false,
  },
];

const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const occurredOn = `${currentMonthKey}-10`;

const testTransactions: SessionTransaction[] = [
  {
    id: 'tx-1',
    createdBy: 'install-test',
    spaceId: 'space-1',
    type: 'expense',
    amountMinor: 5000,
    currency: 'USD',
    title: 'Supermercado USD',
    categoryId: 'food',
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T10:00:00.000Z`,
  },
  {
    id: 'tx-2',
    createdBy: 'install-test',
    spaceId: 'space-1',
    type: 'expense',
    amountMinor: 8000,
    currency: 'VES',
    title: 'Supermercado VES',
    categoryId: 'food',
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T10:00:00.000Z`,
  },
];

describe('CategoryDonutChart', () => {
  it('formatea el total y filtra los segmentos en la moneda especificada (USD)', async () => {
    const screen = await renderWithTheme(
      <CategoryDonutChart
        categories={testCategories}
        currency="USD"
        transactions={testTransactions}
      />,
    );

    // Total en USD: 50 $ (5000 minor)
    expect(screen.getByText(/50/)).toBeTruthy();
    expect(screen.getByText(/\$/)).toBeTruthy();
    expect(
      screen.getByTestId('category-donut-svg', {
        includeHiddenElements: true,
      }).props,
    ).toMatchObject({ height: 205, width: 205 });
    expect(
      screen.getByTestId('category-donut-segment-food', {
        includeHiddenElements: true,
      }).props.strokeWidth,
    ).toBe(12);
  });

  it('formatea el total y filtra los segmentos en la moneda especificada (VES)', async () => {
    const screen = await renderWithTheme(
      <CategoryDonutChart
        categories={testCategories}
        currency="VES"
        transactions={testTransactions}
      />,
    );

    // Total en VES: 80 Bs. (8000 minor)
    expect(screen.getByText(/80/)).toBeTruthy();
    expect(screen.getByText(/Bs\./)).toBeTruthy();
  });

  it('despliega los periodos al pulsar el mes y reparte el año elegido', async () => {
    const lastYearTransaction: SessionTransaction = {
      ...testTransactions[0]!,
      id: 'tx-last-year',
      amountMinor: 2000,
      occurredOn: `${now.getFullYear() - 1}-03-10`,
    };
    const screen = await renderWithTheme(
      <CategoryDonutChart
        categories={testCategories}
        currency="USD"
        transactions={[...testTransactions, lastYearTransaction]}
      />,
    );
    const chart = screen.getByTestId('category-donut-chart');
    const next = () =>
      within(chart).getByRole('button', { name: 'Ver periodo siguiente' });

    expect(next().props.accessibilityState).toMatchObject({ disabled: true });
    expect(within(chart).queryByLabelText('Periodo: Anual')).toBeNull();

    await fireEvent.press(
      within(chart).getByRole('button', {
        expanded: false,
        name: /\d{4}$/,
      }),
    );
    await fireEvent.press(within(chart).getByLabelText('Periodo: Anual'));
    await fireEvent.press(
      within(chart).getByRole('button', { name: 'Ver periodo anterior' }),
    );

    expect(within(chart).getByText(String(now.getFullYear() - 1))).toBeTruthy();
    expect(within(chart).getByText(/^\$\s*20$/)).toBeTruthy();
    expect(next().props.accessibilityState).toMatchObject({ disabled: false });
  });
});
