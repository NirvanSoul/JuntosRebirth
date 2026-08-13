import { act, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { NotificationRulesModal } from '@/features/transactions/components/NotificationRulesModal/NotificationRulesModal';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      onChange,
      testID,
    }: {
      onChange: (event: { type: string }, date?: Date) => void;
      testID?: string;
    }) =>
      React.createElement(Pressable, {
        accessibilityRole: 'button',
        onPress: () => onChange({ type: 'set' }, new Date(2026, 7, 4, 9, 30)),
        testID,
      }),
  };
});

async function pickNineThirty(
  screen: Awaited<ReturnType<typeof renderWithTheme>>,
): Promise<void> {
  await fireEvent.press(screen.getByLabelText('Añadir hora de recordatorio'));
  await fireEvent.press(screen.getByTestId('reminder-time-picker'));
  if (Platform.OS === 'ios') {
    await fireEvent.press(screen.getByText('Añadir'));
  }
}

describe('NotificationRulesModal', () => {
  it('no revela los controles de días y horas hasta activar la regla', async () => {
    const screen = await renderWithTheme(
      <NotificationRulesModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        rules={[]}
        spaceId="personal"
        visible
      />,
    );

    expect(screen.queryByTestId('notification-rule-days-expense-1')).toBeNull();

    await fireEvent.press(
      screen.getByLabelText('Activar recordatorios de gastos'),
    );

    expect(screen.getByTestId('notification-rule-days-expense-1')).toBeTruthy();
  });

  it('exige al menos una hora antes de guardar una regla activada', async () => {
    const onSave = jest.fn();
    const screen = await renderWithTheme(
      <NotificationRulesModal
        onClose={jest.fn()}
        onSave={onSave}
        rules={[]}
        spaceId="personal"
        visible
      />,
    );

    await fireEvent.press(
      screen.getByLabelText('Activar recordatorios de gastos'),
    );
    await fireEvent.press(screen.getByTestId('notification-rules-save'));

    expect(
      screen.getByText('Añade al menos una hora a las reglas activadas.'),
    ).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('guarda ambos tipos, uno tras otro, y cierra al terminar', async () => {
    const onClose = jest.fn();
    const saveOrder: string[] = [];
    const onSave = jest.fn(async (input: { transactionType: string }) => {
      saveOrder.push(input.transactionType);
      return true;
    });
    const screen = await renderWithTheme(
      <NotificationRulesModal
        onClose={onClose}
        onSave={onSave}
        rules={[]}
        spaceId="personal"
        visible
      />,
    );

    await fireEvent.press(
      screen.getByLabelText('Activar recordatorios de gastos'),
    );
    await fireEvent.press(
      screen.getByTestId('notification-rule-days-expense-2'),
    );
    await pickNineThirty(screen);
    await fireEvent.press(screen.getByTestId('notification-rules-save'));

    expect(onSave).toHaveBeenCalledWith({
      spaceId: 'personal',
      transactionType: 'expense',
      isEnabled: true,
      daysBefore: 2,
      times: ['09:30'],
    });
    expect(onSave).toHaveBeenCalledWith({
      spaceId: 'personal',
      transactionType: 'income',
      isEnabled: false,
      daysBefore: 1,
      times: [],
    });
    // Se guarda una regla a la vez, no en paralelo (evita que dos
    // reconciliaciones de notificaciones choquen sobre la misma transacción
    // exclusiva de SQLite).
    expect(saveOrder).toEqual(['expense', 'income']);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('avisa con onSaved al guardar con éxito, pero no si falla', async () => {
    const onSaved = jest.fn();
    const onSave = jest.fn().mockResolvedValue(true);
    const screen = await renderWithTheme(
      <NotificationRulesModal
        onClose={jest.fn()}
        onSave={onSave}
        onSaved={onSaved}
        rules={[]}
        spaceId="personal"
        visible
      />,
    );

    await fireEvent.press(screen.getByTestId('notification-rules-save'));
    expect(onSaved).toHaveBeenCalledTimes(1);

    onSave.mockResolvedValueOnce(false);
    onSaved.mockClear();
    await fireEvent.press(screen.getByTestId('notification-rules-save'));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('no dispara el segundo guardado hasta que el primero resuelve', async () => {
    let resolveExpense: (value: boolean) => void = () => undefined;
    const onSave = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveExpense = resolve;
          }),
      )
      .mockResolvedValueOnce(true);
    const screen = await renderWithTheme(
      <NotificationRulesModal
        onClose={jest.fn()}
        onSave={onSave}
        rules={[]}
        spaceId="personal"
        visible
      />,
    );

    await fireEvent.press(
      screen.getByLabelText('Activar recordatorios de gastos'),
    );
    await pickNineThirty(screen);
    await fireEvent.press(screen.getByTestId('notification-rules-save'));

    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExpense(true);
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('parte del estado de las reglas existentes al abrir', async () => {
    const screen = await renderWithTheme(
      <NotificationRulesModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        rules={[
          {
            id: 'rule-income-personal',
            spaceId: 'personal',
            transactionType: 'income',
            isEnabled: true,
            daysBefore: 0,
            times: ['08:00'],
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        ]}
        spaceId="personal"
        visible
      />,
    );

    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByTestId('notification-rule-days-income-0')).toBeTruthy();
  });
});
