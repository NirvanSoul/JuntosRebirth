import { fireEvent, within } from '@testing-library/react-native';

import { MoneyAccountDetailModal } from '@/features/accounts/components/MoneyAccountDetailModal/MoneyAccountDetailModal';
import type { MoneyAccount } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
  useAppModalBottomInset: () => 0,
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { BottomSheetScrollView: ScrollView };
});

const account: MoneyAccount = {
  id: 'account-1',
  spaceId: 'personal',
  name: 'Cuenta nómina',
  kind: 'bank',
  icon: 'bank',
  colorToken: 'blue',
  currency: 'EUR',
  openingBalanceMinor: 100000,
  isArchived: false,
};

const categories: Category[] = [
  {
    id: 'category-1',
    spaceId: 'personal',
    name: 'Compras',
    icon: 'shopping-bag',
    colorToken: 'orange',
    isDefault: false,
    isArchived: false,
  },
];

const transactions: SessionTransaction[] = [
  {
    id: 'transaction-1',
    createdBy: 'install-test',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 2500,
    currency: 'EUR',
    title: 'Compra',
    categoryId: 'category-1',
    moneyAccountId: 'account-1',
    occurredOn: '2026-08-10',
    recurrence: 'once',
    updatedAt: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 'transaction-2',
    createdBy: 'install-test',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 9900,
    currency: 'EUR',
    title: 'Sin cuenta',
    categoryId: 'category-1',
    occurredOn: '2026-08-11',
    recurrence: 'once',
    updatedAt: '2026-08-11T10:00:00.000Z',
  },
];

function renderModal(
  props: Partial<React.ComponentProps<typeof MoneyAccountDetailModal>> = {},
) {
  return renderWithTheme(
    <MoneyAccountDetailModal
      account={account}
      categories={categories}
      onClose={jest.fn()}
      onDelete={jest.fn()}
      onEdit={jest.fn()}
      onOpenTransactionDetail={jest.fn()}
      transactions={transactions}
      visible
      {...props}
    />,
  );
}

describe('MoneyAccountDetailModal', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-15T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('muestra el saldo con el inicial ya aplicado', async () => {
    const screen = await renderModal();

    expect(
      screen.getByTestId('money-account-detail-balance').props.children,
    ).toBe(formatCurrency(100000 - 2500, 'EUR', 'es-ES'));
    expect(screen.getByTestId('money-account-opening-metric')).toBeTruthy();
  });

  it('lista solo los movimientos asignados a la cuenta', async () => {
    const screen = await renderModal();

    expect(screen.getByText('Compra')).toBeTruthy();
    expect(screen.queryByText('Sin cuenta')).toBeNull();
  });

  it('avisa de que los movimientos se conservan antes de eliminarla', async () => {
    const onDelete = jest.fn();
    const screen = await renderModal({ onDelete });

    await fireEvent.press(screen.getByTestId('money-account-menu-delete-item'));

    expect(screen.getByText('¿Eliminar esta cuenta?')).toBeTruthy();
    expect(
      screen.getByText(
        'Se ocultará de este espacio. Sus movimientos asociados se conservarán.',
      ),
    ).toBeTruthy();

    await fireEvent.press(
      within(screen.getByTestId('money-account-delete-panel')).getByText(
        'Eliminar',
      ),
    );

    expect(onDelete).toHaveBeenCalledWith('account-1');
  });

  it('no muestra nada sin cuenta seleccionada', async () => {
    const screen = await renderModal({ account: null });

    expect(screen.queryByTestId('money-account-detail-modal')).toBeNull();
  });
});
