import { fireEvent } from '@testing-library/react-native';

import { ActivityMovementsHeader } from '@/features/activity/components/ActivityMovementsHeader';
import { darkColors, lightColors } from '@/theme/colors';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('ActivityMovementsHeader', () => {
  it('renderiza los iconos y mantiene operativas ambas acciones', async () => {
    const onOpenFilters = jest.fn();
    const onOpenImport = jest.fn();
    const screen = await renderWithTheme(
      <ActivityMovementsHeader
        activeFilterCount={0}
        onLayout={jest.fn()}
        onOpenFilters={onOpenFilters}
        onOpenImport={onOpenImport}
      />,
    );

    expect(screen.getByTestId('activity-filter-icon').props.color).toBe(
      lightColors.textPrimary,
    );
    expect(screen.getByTestId('activity-import-icon').props.color).toBe(
      lightColors.textPrimary,
    );

    await fireEvent.press(screen.getByTestId('activity-filter-button'));
    await fireEvent.press(screen.getByTestId('activity-import-button'));
    expect(onOpenFilters).toHaveBeenCalledTimes(1);
    expect(onOpenImport).toHaveBeenCalledTimes(1);
  });

  it('usa un color visible en modo oscuro', async () => {
    const screen = await renderWithTheme(
      <ActivityMovementsHeader
        activeFilterCount={2}
        onLayout={jest.fn()}
        onOpenFilters={jest.fn()}
      />,
      { appearance: 'dark' },
    );

    expect(screen.getByTestId('activity-filter-icon').props.color).toBe(
      darkColors.textPrimary,
    );
    expect(screen.getByTestId('activity-import-icon').props.color).toBe(
      darkColors.textPrimary,
    );
  });
});
