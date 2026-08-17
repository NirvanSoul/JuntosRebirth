import { render } from '@testing-library/react-native';

import { CategoryDonutChart } from '@/features/activity/components/CategoryDonutChart';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';

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
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryDonutChart
          categories={testCategories}
          currency="USD"
          transactions={testTransactions}
        />
      </ThemeProvider>,
    );

    // Total en USD: 50 $ (5000 minor)
    expect(screen.getByText(/50/)).toBeTruthy();
    expect(screen.getByText(/\$/)).toBeTruthy();
  });

  it('formatea el total y filtra los segmentos en la moneda especificada (VES)', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryDonutChart
          categories={testCategories}
          currency="VES"
          transactions={testTransactions}
        />
      </ThemeProvider>,
    );

    // Total en VES: 80 Bs. (8000 minor)
    expect(screen.getByText(/80/)).toBeTruthy();
    expect(screen.getByText(/Bs\./)).toBeTruthy();
  });
});
