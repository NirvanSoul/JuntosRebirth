import { fireEvent, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { MoneyAccountPickerGrid } from '@/features/accounts/components/MoneyAccountPickerGrid/MoneyAccountPickerGrid';
import { summarizeMoneyAccounts } from '@/features/accounts/utils/moneyAccountSummary';
import { categoryColors } from '@/theme/categoryColors';
import { renderWithTheme } from '@/test/renderWithTheme';

const accounts = summarizeMoneyAccounts(
  ['bank', 'cash', 'card'].map((id) => ({
    id,
    spaceId: 'personal',
    name: `Cuenta ${id}`,
    kind: 'bank' as const,
    icon: 'bank' as const,
    colorToken: 'blue' as const,
    balances: [{ currency: 'EUR' as const, openingBalanceMinor: 0 }],
    isArchived: false,
  })),
  [],
);

describe('MoneyAccountPickerGrid', () => {
  it('pone las cuentas en columnas de dos, una arriba y otra abajo', async () => {
    const screen = await renderWithTheme(
      <MoneyAccountPickerGrid
        accounts={accounts}
        onSelect={jest.fn()}
        selectedId={undefined}
      />,
    );

    const grid = screen.getByTestId('money-account-picker-grid');
    expect(grid.props.horizontal).toBe(true);
    // Hasta cuatro cuentas caben a la vista, así que no hay que deslizar.
    expect(grid.props.scrollEnabled).toBe(false);
    // Tres cuentas: las dos primeras apiladas y la tercera en la otra columna.
    const firstColumn = within(
      screen.getByTestId('money-account-picker-column-0'),
    );
    expect(firstColumn.getByTestId('money-account-card-bank')).toBeTruthy();
    expect(firstColumn.getByTestId('money-account-card-cash')).toBeTruthy();
    expect(
      within(screen.getByTestId('money-account-picker-column-1')).getByTestId(
        'money-account-card-card',
      ),
    ).toBeTruthy();
  });

  it('deja deslizar a partir de cinco cuentas', async () => {
    const manyAccounts = summarizeMoneyAccounts(
      ['a', 'b', 'c', 'd', 'e'].map((id) => ({
        id,
        spaceId: 'personal',
        name: `Cuenta ${id}`,
        kind: 'bank' as const,
        icon: 'bank' as const,
        colorToken: 'blue' as const,
        balances: [{ currency: 'EUR' as const, openingBalanceMinor: 0 }],
        isArchived: false,
      })),
      [],
    );
    const screen = await renderWithTheme(
      <MoneyAccountPickerGrid
        accounts={manyAccounts}
        onSelect={jest.fn()}
        selectedId={undefined}
      />,
    );

    expect(
      screen.getByTestId('money-account-picker-grid').props.scrollEnabled,
    ).toBe(true);
    expect(
      within(screen.getByTestId('money-account-picker-column-2')).getByTestId(
        'money-account-card-e',
      ),
    ).toBeTruthy();
  });

  it('pinta la cuenta elegida con su color y avisa al pulsar otra', async () => {
    const onSelect = jest.fn();
    const screen = await renderWithTheme(
      <MoneyAccountPickerGrid
        accounts={accounts}
        onSelect={onSelect}
        selectedId="bank"
      />,
    );

    const selected = screen.getByTestId('money-account-card-bank');
    expect(selected.props.accessibilityState).toMatchObject({ checked: true });
    expect(StyleSheet.flatten(selected.props.style)).toMatchObject({
      backgroundColor: categoryColors.blue,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('money-account-card-bank-title').props.style,
      ),
    ).toMatchObject({ color: '#FFFFFF' });

    await fireEvent.press(screen.getByTestId('money-account-card-cash'));
    expect(onSelect).toHaveBeenCalledWith('cash');
  });
});
