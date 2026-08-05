import { TransactionPeriodModal } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import type { SessionTransaction } from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';

function transaction(
  id: string,
  type: 'expense' | 'income',
  amountMinor: number,
  occurredOn: string,
): SessionTransaction {
  return {
    id,
    spaceId: 'personal',
    categoryId: 'general',
    type,
    amountMinor,
    currency: 'EUR',
    title: id,
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T12:00:00.000Z`,
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
});
