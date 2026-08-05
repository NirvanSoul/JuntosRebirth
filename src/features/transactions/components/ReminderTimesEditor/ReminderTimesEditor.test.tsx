import { fireEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Platform } from 'react-native';

import { ReminderTimesEditor } from '@/features/transactions/components/ReminderTimesEditor/ReminderTimesEditor';
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

function Harness({ initialTimes = [] }: { initialTimes?: string[] }) {
  const [times, setTimes] = useState<readonly string[]>(initialTimes);
  return <ReminderTimesEditor onChange={setTimes} times={times} />;
}

async function pickNineThirty(
  screen: Awaited<ReturnType<typeof renderWithTheme>>,
): Promise<void> {
  await fireEvent.press(screen.getByLabelText('Añadir hora de recordatorio'));
  await fireEvent.press(screen.getByTestId('reminder-time-picker'));
  if (Platform.OS === 'ios') {
    await fireEvent.press(screen.getByText('Añadir'));
  }
}

describe('ReminderTimesEditor', () => {
  it('muestra el estado vacío cuando no hay horas', async () => {
    const screen = await renderWithTheme(<Harness />);

    expect(screen.getByText('Añade al menos una hora.')).toBeTruthy();
  });

  it('añade una hora elegida en el selector nativo', async () => {
    const screen = await renderWithTheme(<Harness />);

    await pickNineThirty(screen);

    expect(screen.getByText('09:30')).toBeTruthy();
    expect(screen.queryByText('Añade al menos una hora.')).toBeNull();
  });

  it('quita una hora existente', async () => {
    const screen = await renderWithTheme(<Harness initialTimes={['09:00']} />);

    await fireEvent.press(
      screen.getByLabelText('Quitar recordatorio de las 09:00'),
    );

    expect(screen.queryByText('09:00')).toBeNull();
    expect(screen.getByText('Añade al menos una hora.')).toBeTruthy();
  });

  it('oculta la acción de añadir al alcanzar el máximo', async () => {
    const screen = await renderWithTheme(
      <ReminderTimesEditor
        maxTimes={3}
        onChange={jest.fn()}
        times={['06:00', '07:00', '08:00']}
      />,
    );

    expect(screen.queryByLabelText('Añadir hora de recordatorio')).toBeNull();
    expect(
      screen.getByText(
        'Alcanzaste el máximo de 3 recordatorios en un mismo día.',
      ),
    ).toBeTruthy();
  });
});
