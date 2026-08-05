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
    expect(queryByTestId('badges-comparison-label')).toBeNull();
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

  it('muestra el porcentaje de cambio y la etiqueta del periodo cuando hay comparación', async () => {
    const { getByText } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="del mes"
        comparisonPeriodLabel="vs. mes anterior"
        expenseMinor={800}
        expenseComparison={{ changePercent: 60, direction: 'up' }}
        incomeMinor={1000}
        incomeComparison={{ changePercent: -10, direction: 'down' }}
        testIDPrefix="badges"
      />,
    );

    expect(getByText('vs. mes anterior')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();
    expect(getByText('10%')).toBeTruthy();
  });

  it('muestra la comparación de balance solo cuando se pasa balanceMinor', async () => {
    const { getByTestId } = await renderWithTheme(
      <TransactionSummaryBadges
        accessibilityContext="del mes"
        balanceComparison={{ changePercent: 0, direction: 'flat' }}
        balanceMinor={200}
        expenseMinor={800}
        incomeMinor={1000}
        testIDPrefix="badges"
      />,
    );

    expect(getByTestId('badges-balance-comparison')).toBeTruthy();
  });
});
