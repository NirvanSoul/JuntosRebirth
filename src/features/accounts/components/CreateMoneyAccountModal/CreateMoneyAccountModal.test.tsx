import { fireEvent } from '@testing-library/react-native';

import { CreateMoneyAccountModal } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal';
import type { MoneyAccount } from '@/features/accounts/types';
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
  const { ScrollView, TextInput } = jest.requireActual('react-native');
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
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
      spaceId="personal"
      spaceName="Personal"
      visible
      {...props}
    />,
  );
}

describe('CreateMoneyAccountModal', () => {
  it('crea una cuenta con su tipo, moneda y saldo inicial', async () => {
    const onSubmit = jest.fn();
    const screen = await renderModal({ onSubmit });

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la cuenta'),
      'Efectivo',
    );
    await fireEvent.press(screen.getByLabelText('Efectivo'));
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), '250');
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'personal',
        name: 'Efectivo',
        kind: 'cash',
        balances: [{ currency: 'EUR', openingBalanceMinor: 25000 }],
      }),
    );
  });

  it('acepta un saldo inicial negativo escrito con el signo', async () => {
    const onSubmit = jest.fn();
    const screen = await renderModal({ onSubmit });

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la cuenta'),
      'Visa',
    );
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), '-450');
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        balances: [{ currency: 'EUR', openingBalanceMinor: -45000 }],
      }),
    );
  });

  it('conserva los céntimos de un saldo negativo', async () => {
    const onSubmit = jest.fn();
    const screen = await renderModal({ onSubmit });

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la cuenta'),
      'Visa',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Saldo inicial'),
      '-450,50',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        balances: [{ currency: 'EUR', openingBalanceMinor: -45050 }],
      }),
    );
  });

  it('ofrece solo los tres tipos de cuenta', async () => {
    const screen = await renderModal();

    expect(screen.getByLabelText('Efectivo')).toBeTruthy();
    expect(screen.getByLabelText('Cuenta bancaria')).toBeTruthy();
    expect(screen.getByLabelText('Tarjeta')).toBeTruthy();
    expect(screen.queryByLabelText('Tarjeta de débito')).toBeNull();
    expect(screen.queryByLabelText('Ahorro')).toBeNull();
  });

  it('no deja continuar con un nombre repetido en el mismo espacio', async () => {
    const screen = await renderModal({ accounts: [account] });

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la cuenta'),
      'cuenta NÓMINA',
    );
    // El botón queda deshabilitado, así que el aviso llega por la tecla de
    // retorno del teclado, igual que en el modal de categoría.
    await fireEvent(
      screen.getByLabelText('Nombre de la cuenta'),
      'submitEditing',
    );

    expect(
      screen.getByText('Ya existe una cuenta con ese nombre en este espacio.'),
    ).toBeTruthy();
  });

  it('permite añadir una segunda moneda sin modificar la original bloqueada', async () => {
    const onSubmit = jest.fn();
    const screen = await renderModal({
      account,
      accounts: [account],
      isCurrencyLocked: true,
      onSubmit,
    });

    expect(
      screen.getByText(
        'La moneda original no se puede cambiar porque ya tiene movimientos. Puedes añadir una segunda moneda.',
      ),
    ).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), '999');
    await fireEvent.press(
      screen.getByLabelText('🇺🇸 Dólar estadounidense (USD)'),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Saldo inicial en USD'),
      '50',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Guardar cambios de cuenta'));

    // El saldo de la moneda original se conserva y solo se añade la nueva.
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        balances: [
          { currency: 'EUR', openingBalanceMinor: 125000 },
          { currency: 'USD', openingBalanceMinor: 5000 },
        ],
      }),
    );
  });

  it('precarga los datos de la cuenta al editarla', async () => {
    const screen = await renderModal({ account, accounts: [account] });

    expect(screen.getByLabelText('Nombre de la cuenta').props.value).toBe(
      'Cuenta nómina',
    );
    expect(screen.getByLabelText('Saldo inicial').props.value).toBe('1.250');
  });

  it('precarga el signo de una cuenta que arrastra deuda', async () => {
    const screen = await renderModal({
      account: {
        ...account,
        balances: [{ currency: 'EUR' as const, openingBalanceMinor: -45000 }],
      },
      accounts: [account],
    });

    expect(screen.getByLabelText('Saldo inicial').props.value).toBe('-450');
  });

  it('permite marcar varias monedas y dar a cada una su saldo', async () => {
    const onSubmit = jest.fn();
    const screen = await renderModal({ onSubmit });

    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la cuenta'),
      'Cuenta multidivisa',
    );
    await fireEvent.press(
      screen.getByLabelText('🇺🇸 Dólar estadounidense (USD)'),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Saldo inicial en EUR'),
      '1000',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Saldo inicial en USD'),
      '-250',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        balances: [
          { currency: 'EUR', openingBalanceMinor: 100000 },
          { currency: 'USD', openingBalanceMinor: -25000 },
        ],
      }),
    );
  });

  it('no deja quedarse sin ninguna moneda', async () => {
    const screen = await renderModal();

    await fireEvent.press(screen.getByLabelText('🇪🇺 Euro (EUR)'));

    // Sin moneda no habría saldo que calcular, así que la última no se quita.
    expect(screen.getByLabelText('Saldo inicial')).toBeTruthy();
  });
});
