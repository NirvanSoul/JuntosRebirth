import { DeviceEventEmitter, Platform, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { CreateMoneyAccountModal } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal';
import {
  moneyAccountIconNames,
  type MoneyAccount,
} from '@/features/accounts/types';
import { categoryIconNames } from '@/features/categories/types';
import { renderWithTheme } from '@/test/renderWithTheme';
import { spacing } from '@/theme/spacing';

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
  const { ScrollView, TextInput } = jest.requireActual('react-native');
  return { BottomSheetScrollView: ScrollView, BottomSheetTextInput: TextInput };
});

const account: MoneyAccount = {
  id: 'account-1',
  spaceId: 'personal',
  name: 'Cuenta nómina',
  kind: 'bank',
  icon: 'bank',
  colorToken: 'blue',
  balances: [{ currency: 'EUR', openingBalanceMinor: 125000 }],
  isArchived: false,
};

function renderModal(
  props: Partial<React.ComponentProps<typeof CreateMoneyAccountModal>> = {},
) {
  return renderWithTheme(
    <CreateMoneyAccountModal
      accounts={[]}
      availableCurrencies={['EUR', 'USD']}
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      spaceCurrency="EUR"
      spaceId="personal"
      spaceName="Personal"
      visible
      {...props}
    />,
  );
}

async function moveToKind(screen: Awaited<ReturnType<typeof renderModal>>) {
  await fireEvent.changeText(
    screen.getByLabelText('Nombre de la cuenta'),
    'Efectivo',
  );
  await fireEvent.press(screen.getByLabelText('Continuar tipo de cuenta'));
}

describe('CreateMoneyAccountModal', () => {
  it('separa el campo de nombre del subtítulo del modal', async () => {
    const screen = await renderModal();

    expect(
      StyleSheet.flatten(
        screen.getByLabelText('Nombre de la cuenta').props.style,
      ).marginTop,
    ).toBe(spacing.xxl);
  });

  it('crea una cuenta en tres pasos con su tipo y saldo inicial', async () => {
    const onSubmit = jest.fn();
    const screen = await renderModal({ onSubmit });

    expect(screen.queryByText('Elige el tipo de cuenta')).toBeNull();
    await moveToKind(screen);
    expect(screen.getByText('Elige el tipo de cuenta')).toBeTruthy();
    expect(screen.queryByText('Tipo')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByLabelText('Saldo inicial').props.style)
        .marginTop,
    ).toBe(spacing.none);
    await fireEvent.press(screen.getByLabelText('Efectivo'));
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), '250');
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    expect(screen.getByTestId('money-account-appearance-step')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Efectivo',
        kind: 'cash',
        balances: [{ currency: 'EUR', openingBalanceMinor: 25000 }],
      }),
    );
  });

  it('nace solo con la moneda principal del espacio', async () => {
    const screen = await renderModal();
    await moveToKind(screen);

    expect(screen.queryByText('Monedas')).toBeNull();
    expect(screen.queryByLabelText('🇺🇸 Dólar estadounidense (USD)')).toBeNull();
  });

  it('acerca continuar al campo mientras el teclado está visible', async () => {
    const screen = await renderModal();
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    expect(
      StyleSheet.flatten(
        screen.getByTestId('money-account-name-action').props.style,
      ).flex,
    ).toBe(1);
    await act(async () => DeviceEventEmitter.emit(showEvent));
    expect(
      StyleSheet.flatten(
        screen.getByTestId('money-account-name-action').props.style,
      ).flex,
    ).toBe(0);
    await act(async () => DeviceEventEmitter.emit(hideEvent));
    expect(
      StyleSheet.flatten(
        screen.getByTestId('money-account-name-action').props.style,
      ).flex,
    ).toBe(1);
  });

  it('vuelve por los pasos antes de cerrar el modal', async () => {
    const onClose = jest.fn();
    const screen = await renderModal({ onClose });

    await moveToKind(screen);
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(screen.getByLabelText('Nombre de la cuenta')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    await moveToKind(screen);
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    expect(screen.getByTestId('money-account-appearance-step')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(screen.getByText('Elige el tipo de cuenta')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(screen.getByLabelText('Nombre de la cuenta')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('incluye cada icono de categoría que no estaba ya entre los de cuenta', () => {
    expect(moneyAccountIconNames).toEqual(
      expect.arrayContaining(categoryIconNames),
    );
  });

  it('no deja continuar con un nombre repetido en el mismo espacio', async () => {
    const screen = await renderModal({ accounts: [account] });
    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la cuenta'),
      'cuenta NÓMINA',
    );
    await fireEvent(
      screen.getByLabelText('Nombre de la cuenta'),
      'submitEditing',
    );
    expect(
      screen.getByText('Ya existe una cuenta con ese nombre en este espacio.'),
    ).toBeTruthy();
  });

  it('mantiene la edición de monedas existente tras confirmar el nombre', async () => {
    const screen = await renderModal({
      account,
      accounts: [account],
      isCurrencyLocked: true,
    });
    await fireEvent.press(screen.getByLabelText('Continuar tipo de cuenta'));
    expect(
      screen.getByText(
        'La moneda original no se puede cambiar porque ya tiene movimientos. Puedes añadir una segunda moneda.',
      ),
    ).toBeTruthy();
  });
});
