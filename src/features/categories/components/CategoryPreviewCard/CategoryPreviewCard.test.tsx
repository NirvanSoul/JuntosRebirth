import { render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';

describe('CategoryPreviewCard', () => {
  it('muestra el ingreso en lugar del gasto cuando la categoría solo tiene ingresos (row)', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryPreviewCard
          colorToken="slate"
          expenseMinor={0}
          icon="fork-knife"
          incomeMinor={5000}
          name="Nómina"
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('category-preview-card');
    const amount = within(card).getByTestId('category-preview-spent-amount');

    expect(amount.props.children).toMatch(/50/);
    expect(StyleSheet.flatten(amount.props.style).color).toBe(colors.income);
    expect(
      within(card).queryByTestId('category-preview-available-amount'),
    ).toBeNull();
    expect(card.props.accessibilityLabel).toBe('Nómina, 50 € ingresado');
  });

  it('no muestra ningún importe cuando la categoría no tiene movimientos (row)', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryPreviewCard
          colorToken="slate"
          expenseMinor={0}
          icon="fork-knife"
          incomeMinor={0}
          name="Vacía"
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('category-preview-card');

    expect(
      within(card).queryByTestId('category-preview-spent-amount'),
    ).toBeNull();
    expect(card.props.accessibilityLabel).toBe('Vacía');
  });

  it('muestra el ingreso en lugar del gasto cuando la categoría solo tiene ingresos (tile)', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryPreviewCard
          colorToken="slate"
          expenseMinor={0}
          icon="fork-knife"
          incomeMinor={5000}
          name="Nómina"
          variant="tile"
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('category-preview-card');

    expect(screen.getByText(/50/)).toBeTruthy();
    expect(card.props.accessibilityLabel).toBe('Nómina, ingresado 50 €');
  });

  it('formatea importes usando la moneda especificada (VES) en vez de EUR', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryPreviewCard
          budgetMinor={10000}
          colorToken="slate"
          currency="VES"
          expenseMinor={4000}
          icon="fork-knife"
          incomeMinor={0}
          name="Alimentación"
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('category-preview-card');
    expect(card.props.accessibilityLabel).toContain('Bs.');
    expect(card.props.accessibilityLabel).not.toContain('€');
  });
});
