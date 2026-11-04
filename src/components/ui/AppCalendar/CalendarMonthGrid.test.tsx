import { fireEvent } from '@testing-library/react-native';

import { CalendarMonthGrid } from '@/components/ui/AppCalendar/CalendarMonthGrid';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('CalendarMonthGrid', () => {
  it('muestra los doce meses del año y salta al elegido', async () => {
    const onSelectMonth = jest.fn();
    const screen = await renderWithTheme(
      <CalendarMonthGrid
        maxMonth="2026-11"
        minMonth="2026-01"
        onClose={jest.fn()}
        onSelectMonth={onSelectMonth}
        selectedMonth="2026-11"
        testID="months"
      />,
    );

    expect(screen.getByText('2026')).toBeTruthy();
    for (let month = 1; month <= 12; month += 1) {
      expect(
        screen.getByTestId(`months.2026-${String(month).padStart(2, '0')}`),
      ).toBeTruthy();
    }

    await fireEvent.press(screen.getByTestId('months.2026-09'));
    expect(onSelectMonth).toHaveBeenCalledWith('2026-09');
  });

  it('apaga los meses fuera del rango con tasas', async () => {
    const onSelectMonth = jest.fn();
    const screen = await renderWithTheme(
      <CalendarMonthGrid
        maxMonth="2026-11"
        minMonth="2026-01"
        onClose={jest.fn()}
        onSelectMonth={onSelectMonth}
        selectedMonth="2026-11"
        testID="months"
      />,
    );

    const december = screen.getByTestId('months.2026-12');
    expect(december.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(december);
    expect(onSelectMonth).not.toHaveBeenCalled();
  });

  it('vuelve al calendario al pulsar el año', async () => {
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <CalendarMonthGrid
        onClose={onClose}
        onSelectMonth={jest.fn()}
        selectedMonth="2026-11"
        testID="months"
      />,
    );

    await fireEvent.press(screen.getByTestId('months.year'));
    expect(onClose).toHaveBeenCalled();
  });
});
