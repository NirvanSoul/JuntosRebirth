import { PeriodComparisonIndicator } from '@/features/transactions/components/PeriodComparisonIndicator/PeriodComparisonIndicator';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('PeriodComparisonIndicator', () => {
  it('muestra un aumento de gastos como desfavorable', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changeMinor: 2000, direction: 'up' }}
        currency="EUR"
        tone="expense"
      />,
    );

    expect(getByText('20\u00a0€')).toBeTruthy();
  });

  it('muestra una disminución de gastos como favorable', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changeMinor: -3050, direction: 'down' }}
        currency="EUR"
        previousPeriodLabel="el mes anterior"
        tone="expense"
      />,
    );

    expect(getByText('30,50\u00a0€')).toBeTruthy();
    expect(getByText('menos que el mes anterior')).toBeTruthy();
  });

  it('muestra un aumento de ingresos como favorable', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changeMinor: 1500, direction: 'up' }}
        currency="EUR"
        tone="income"
      />,
    );

    expect(getByText('15\u00a0€')).toBeTruthy();
  });

  it('muestra 0 € sin cambios', async () => {
    const { getByText } = await renderWithTheme(
      <PeriodComparisonIndicator
        comparison={{ changeMinor: 0, direction: 'flat' }}
        currency="EUR"
        tone="balance"
      />,
    );

    expect(getByText('0\u00a0€')).toBeTruthy();
  });
});
