import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { TransactionReminderModal } from '@/features/transactions/components/TransactionReminderModal/TransactionReminderModal';
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

const reminder = {
  id: 'reminder-1',
  transactionId: 'transaction-1',
  spaceId: 'personal',
  remindOn: '2026-08-10',
  times: [] as string[],
  createdAt: '2026-08-04T00:00:00.000Z',
  updatedAt: '2026-08-04T00:00:00.000Z',
};

describe('TransactionReminderModal', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T08:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reutiliza ReminderTimesEditor: guarda deshabilitado sin horas y habilitado tras añadir una', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const screen = await renderWithTheme(
      <TransactionReminderModal
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSave={onSave}
        reminder={reminder}
        transactionOccurredOn="2026-08-10"
        transactionTitle="Alquiler"
        visible
      />,
    );

    await fireEvent.press(
      screen.getByLabelText('Continuar a elegir las horas'),
    );
    expect(
      screen.getByLabelText('Guardar recordatorio').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(screen.getByText('Añade al menos una hora.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Añadir hora de recordatorio'));
    await fireEvent.press(screen.getByTestId('reminder-time-picker'));
    if (Platform.OS === 'ios') {
      await fireEvent.press(screen.getByText('Añadir'));
    }

    expect(screen.getByText('09:30')).toBeTruthy();
    expect(
      screen.getByLabelText('Guardar recordatorio').props.accessibilityState,
    ).toMatchObject({ disabled: false });

    await fireEvent.press(screen.getByLabelText('Guardar recordatorio'));

    expect(onSave).toHaveBeenCalledWith({
      remindOn: '2026-08-10',
      times: ['09:30'],
    });
  });
});
