import { fireEvent } from '@testing-library/react-native';
import { getCalendars } from 'expo-localization';
import { Platform } from 'react-native';

import { TransactionDetailTimeRow } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailTimeRow';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      onValueChange,
      testID,
    }: {
      onValueChange: (event: { type: string }, date: Date) => void;
      testID?: string;
    }) =>
      React.createElement(Pressable, {
        accessibilityRole: 'button',
        onPress: () =>
          onValueChange({ type: 'set' }, new Date(2026, 10, 4, 9, 5)),
        testID,
      }),
  };
});

describe('TransactionDetailTimeRow', () => {
  afterEach(() => {
    jest
      .mocked(getCalendars)
      .mockReturnValue([{ uses24hourClock: true } as never]);
  });

  it('invita a agregar la hora cuando el movimiento no la tiene', async () => {
    const screen = await renderWithTheme(
      <TransactionDetailTimeRow onChange={jest.fn()} transactionId="tx-1" />,
    );

    expect(screen.getByText('Agregar hora')).toBeTruthy();
    expect(
      screen.getByLabelText('Agregar una hora a este movimiento'),
    ).toBeTruthy();
    expect(screen.queryByText('00:00')).toBeNull();
  });

  it('guarda la hora elegida en formato HH:mm', async () => {
    const onChange = jest.fn();
    const screen = await renderWithTheme(
      <TransactionDetailTimeRow onChange={onChange} transactionId="tx-1" />,
    );

    await fireEvent.press(screen.getByTestId('transaction-detail-time-row'));
    await fireEvent.press(screen.getByTestId('transaction-time-picker'));
    if (Platform.OS === 'ios') {
      await fireEvent.press(screen.getByTestId('transaction-time-save'));
    }

    expect(onChange).toHaveBeenCalledWith('09:05');
  });

  it('respeta el formato de 12 horas del sistema', async () => {
    jest
      .mocked(getCalendars)
      .mockReturnValue([{ uses24hourClock: false } as never]);
    const screen = await renderWithTheme(
      <TransactionDetailTimeRow
        occurredTime="14:35"
        onChange={jest.fn()}
        transactionId="tx-1"
      />,
    );

    expect(screen.queryByText('14:35')).toBeNull();
    expect(screen.getByLabelText(/^Cambiar hora: 2:35/)).toBeTruthy();
  });

  it('no guarda nada si se confirma la misma hora', async () => {
    const onChange = jest.fn();
    const screen = await renderWithTheme(
      <TransactionDetailTimeRow
        occurredTime="09:05"
        onChange={onChange}
        transactionId="tx-1"
      />,
    );

    await fireEvent.press(screen.getByTestId('transaction-detail-time-row'));
    await fireEvent.press(screen.getByTestId('transaction-time-picker'));
    if (Platform.OS === 'ios') {
      await fireEvent.press(screen.getByTestId('transaction-time-save'));
    }

    expect(onChange).not.toHaveBeenCalled();
  });
});
