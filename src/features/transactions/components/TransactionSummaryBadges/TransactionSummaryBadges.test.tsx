import { StyleSheet } from 'react-native';

import { TransactionSummaryBadges } from '@/features/transactions/components/TransactionSummaryBadges/TransactionSummaryBadges';
import { renderWithTheme } from '@/test/renderWithTheme';
import { spacing } from '@/theme/spacing';

describe('TransactionSummaryBadges', () => {
  it('no muestra ninguna comparación cuando no se pasan las props de comparación', async () => {
    const { queryByTestId } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="del mes"
        expenseMinor={500}
        incomeMinor={1000}
        testIDPrefix="badges"
      />,
    );

    expect(queryByTestId('badges-income-comparison')).toBeNull();
    expect(queryByTestId('badges-expense-comparison')).toBeNull();
  });

  it('conserva el estilo del contenedor de badges pasado por props', async () => {
    const { getByTestId } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="del mes"
        expenseMinor={500}
        incomeMinor={1000}
        style={{ marginTop: spacing.lg }}
        testIDPrefix="badges"
      />,
    );

    expect(
      StyleSheet.flatten(getByTestId('badges-summary').props.style).marginTop,
    ).toBe(spacing.lg);
  });

  it('alterna el importe con la diferencia exacta dentro de cada badge, sin etiqueta de periodo', async () => {
    const { getByTestId, getByText, queryByText } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="del mes"
        expenseMinor={800}
        expenseComparison={{ changeMinor: 300, direction: 'up' }}
        incomeMinor={1000}
        incomeComparison={{ changeMinor: -100, direction: 'down' }}
        testIDPrefix="badges"
      />,
    );

    expect(queryByText('vs. mes anterior')).toBeNull();
    expect(getByTestId('badges-income-badge')).toContainElement(
      getByTestId('badges-income-comparison'),
    );
    expect(getByTestId('badges-expense-comparison-amount')).toHaveTextContent(
      '+3\u00a0€',
    );
    expect(getByTestId('badges-expense-badge').props.accessibilityLabel).toBe(
      'Gastos del mes: 8\u00a0€, 3\u00a0€ más que el periodo anterior',
    );
    expect(getByText('\u22121\u00a0€')).toBeTruthy();
  });

  it('muestra la comparación de balance solo cuando se pasa balanceMinor', async () => {
    const { getByTestId } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="del mes"
        balanceComparison={{ changeMinor: 0, direction: 'flat' }}
        balanceMinor={200}
        expenseMinor={800}
        incomeMinor={1000}
        testIDPrefix="badges"
      />,
    );

    expect(getByTestId('badges-balance-comparison')).toBeTruthy();
  });

  it('formatea los tres importes en la moneda seleccionada', async () => {
    const { getByLabelText, queryByLabelText } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="de los movimientos filtrados"
        balanceMinor={750}
        currency="USD"
        expenseMinor={1250}
        incomeMinor={2000}
        testIDPrefix="badges"
      />,
    );

    expect(
      getByLabelText(/Ingresos de los movimientos filtrados:.*20/),
    ).toBeTruthy();
    expect(
      getByLabelText(/Gastos de los movimientos filtrados:.*12,50/),
    ).toBeTruthy();
    expect(
      getByLabelText(/Balance de los movimientos filtrados:.*7,50/),
    ).toBeTruthy();
    expect(queryByLabelText(/€$/)).toBeNull();
  });
});
