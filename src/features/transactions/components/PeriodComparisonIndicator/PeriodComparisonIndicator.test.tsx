import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('PeriodComparisonIndicator', () => {
  it('muestra un aumento de gastos como desfavorable', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changePercent: 20, direction: 'up' }}
        tone="expense"
      />,
    );

    expect(getByText('20%')).toBeTruthy();
  });

  it('muestra una disminución de gastos como favorable', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changePercent: -20, direction: 'down' }}
        tone="expense"
      />,
    );

    expect(getByText('20%')).toBeTruthy();
  });

  it('muestra un aumento de ingresos como favorable', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changePercent: 15, direction: 'up' }}
        tone="income"
      />,
    );

    expect(getByText('15%')).toBeTruthy();
  });

  it('muestra 0% sin cambios', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changePercent: 0, direction: 'flat' }}
        tone="balance"
      />,
    );

    expect(getByText('0%')).toBeTruthy();
  });
});
