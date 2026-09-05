import { fireEvent, within } from '@testing-library/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';

import { MoneyAccountDetailModal } from '@/features/accounts/components/MoneyAccountDetailModal/MoneyAccountDetailModal';
import type { MoneyAccount } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

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
  balances: [{ currency: 'EUR', openingBalanceMinor: 100000 }],
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
      onAddTransaction={jest.fn()}
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
  it('muestra los movimientos convertidos como un valor histórico separado del balance', async () => {
    const venezuelaAccount: MoneyAccount = {
      ...account,
      balances: [{ currency: 'USD', openingBalanceMinor: 0 }],
    };
    const venezuelaTransaction: SessionTransaction = {
      ...transactions[0]!,
      currency: 'USD',
      occurredOn: '2026-08-14',
      exchangeSnapshot: {
        countryCode: 'VE',
        createdWithCurrency: 'USD',
        rates: {
          BCV: {
            baseCurrency: 'USD',
            quoteCurrency: 'VES',
            rate: '50',
            convertedAmountMinor: 125_000,
            observedAt: '2026-09-04T04:00:00.000Z',
          },
          EURO: {
            baseCurrency: 'USD',
            quoteCurrency: 'EUR',
            rate: '0.91',
            convertedAmountMinor: 2_275,
            observedAt: '2026-09-04T04:00:00.000Z',
          },
        },
      },
    };
    const screen = await renderModal({
      account: venezuelaAccount,
      transactions: [venezuelaTransaction],
    });

    expect(
      screen.getByTestId('money-account-historical-valuation'),
    ).toBeTruthy();
    expect(
      screen.getByText('Movimientos valorados históricamente'),
    ).toBeTruthy();
    expect(screen.getByText(/Bs\. 1\.250/)).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId(
        'money-account-historical-valuation-source-selector-control-EURO',
      ),
    );

    expect(screen.getByText(/22,75/)).toBeTruthy();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-15T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('muestra balance, ingresos y gastos por divisa fuera del encabezado', async () => {
    const screen = await renderModal();

    expect(screen.queryByTestId('money-account-detail-balance')).toBeNull();
    expect(screen.getByText('Balance EUR')).toBeTruthy();
    expect(screen.getByText('Ingresos EUR')).toBeTruthy();
    expect(screen.getByText('Gastos EUR')).toBeTruthy();
    expect(screen.getByTestId('money-account-balance-EUR')).toBeTruthy();
    expect(screen.getByTestId('money-account-income-EUR')).toBeTruthy();
    expect(screen.getByTestId('money-account-expense-EUR')).toBeTruthy();
    const balanceMetric = screen.getByTestId('money-account-balance-EUR');
    expect(StyleSheet.flatten(balanceMetric.props.style).alignItems).toBe(
      'center',
    );
    expect(
      StyleSheet.flatten(within(balanceMetric).getByText(/975/).props.style)
        .fontSize,
    ).toBe(typography.amount.fontSize);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('money-account-income-EUR-icon').props.style,
      ).backgroundColor,
    ).toBeUndefined();
    expect(
      screen.getByTestId('money-account-income-EUR-glyph').props.children,
    ).toContain(String.fromCodePoint(Number(Ionicons.glyphMap['arrow-up'])));
    expect(
      screen.getByTestId('money-account-expense-EUR-glyph').props.children,
    ).toContain(String.fromCodePoint(Number(Ionicons.glyphMap['arrow-down'])));
  });

  it('lista solo los movimientos asignados a la cuenta', async () => {
    const screen = await renderModal();

    expect(screen.getByText('Compra')).toBeTruthy();
    expect(screen.queryByText('Sin cuenta')).toBeNull();
  });

  it('mantiene blanco el icono de la cuenta sobre colores claros', async () => {
    const screen = await renderModal({
      account: { ...account, colorToken: 'slate' },
    });

    expect(
      screen.getByTestId('phosphor-react-native-bank-fill').props.color,
    ).toBe(colors.onBrand);
  });

  it('permite añadir un movimiento a la cuenta desde su detalle', async () => {
    const onAddTransaction = jest.fn();
    const screen = await renderModal({ onAddTransaction });

    expect(screen.getByText('Añadir movimiento')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('money-account-action-icon-add'));

    expect(onAddTransaction).toHaveBeenCalledWith('account-1');
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

  it('cambia la divisa del resumen sin filtrar los movimientos de la cuenta', async () => {
    const screen = await renderModal({
      account: {
        ...account,
        balances: [
          { currency: 'EUR' as const, openingBalanceMinor: 100000 },
          { currency: 'USD' as const, openingBalanceMinor: 50000 },
        ],
      },
    });

    expect(screen.getByText('Balance EUR')).toBeTruthy();
    expect(screen.getByTestId('money-account-currency-selector')).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId('money-account-currency-selector-USD'),
    );

    expect(screen.queryByText('Balance EUR')).toBeNull();
    expect(screen.getByText('Balance USD')).toBeTruthy();
    expect(screen.getByText('Ingresos USD')).toBeTruthy();
    expect(screen.getByText('Gastos USD')).toBeTruthy();
    expect(screen.getByText('Compra')).toBeTruthy();
  });
});
