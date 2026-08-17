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
          budgetExpenseMinor={0}
          colorToken="slate"
          displayCurrency="EUR"
          expenseMinor={0}
          icon="fork-knife"
          incomeMinor={5000}
          name="Nómina"
          spaceCurrency="EUR"
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
          budgetExpenseMinor={0}
          colorToken="slate"
          displayCurrency="EUR"
          expenseMinor={0}
          icon="fork-knife"
          incomeMinor={0}
          name="Vacía"
          spaceCurrency="EUR"
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
          budgetExpenseMinor={0}
          colorToken="slate"
          displayCurrency="EUR"
          expenseMinor={0}
          icon="fork-knife"
          incomeMinor={5000}
          name="Nómina"
          spaceCurrency="EUR"
          variant="tile"
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('category-preview-card');

    expect(screen.getByText(/50/)).toBeTruthy();
    expect(card.props.accessibilityLabel).toBe('Nómina, ingresado 50 €');
  });

  it('multidivisa: calcula presupuesto y disponible en spaceCurrency mientras muestra totales en displayCurrency', async () => {
    // Caso de caracterización decisivo:
    // Presupuesto: 100 VES (10000 minor)
    // Gasto visible en displayCurrency: 10 EUR (1000 minor)
    // Gasto en spaceCurrency: 40 VES (4000 minor)
    // Resultado esperado: Gasto visible muestra 10 EUR, Disponible muestra 60 VES (no 90), progreso 40% (4000/10000).
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryPreviewCard
          budgetExpenseMinor={4000}
          budgetMinor={10000}
          colorToken="orange"
          displayCurrency="EUR"
          expenseMinor={1000}
          icon="fork-knife"
          incomeMinor={0}
          name="Comida"
          spaceCurrency="VES"
          variant="row"
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('category-preview-card');
    const spentAmount = within(card).getByTestId(
      'category-preview-spent-amount',
    );
    const availableAmount = within(card).getByTestId(
      'category-preview-available-amount',
    );

    // Gasto visible en EUR
    expect(spentAmount.props.children).toContain('10');
    expect(spentAmount.props.children).toContain('€');

    // Disponible en VES (100 - 40 = 60 VES, nunca 100 - 10 = 90)
    expect(availableAmount.props.children).toContain('60');
    expect(availableAmount.props.children).toContain('Bs.');

    // Progreso accesible
    expect(card.props.accessibilityLabel).toContain('10 € gastado');
    expect(card.props.accessibilityLabel).toContain('Bs. 60 disponible');
  });

  it('multidivisa tile: anillo de progreso calcula budgetExpenseMinor / budgetMinor', async () => {
    const screen = await render(
      <ThemeProvider initialAppearance="light">
        <CategoryPreviewCard
          budgetExpenseMinor={4000}
          budgetMinor={10000}
          colorToken="orange"
          displayCurrency="EUR"
          expenseMinor={1000}
          icon="fork-knife"
          incomeMinor={0}
          name="Comida"
          spaceCurrency="VES"
          variant="tile"
        />
      </ThemeProvider>,
    );

    const ring = screen.getByTestId('category-budget-ring');
    // Progreso del 40%
    expect(ring.props.accessibilityLabel).toBe('Presupuesto utilizado 40%');
  });
});
