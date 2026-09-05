import { RateBadge } from '@/features/exchangeRates/components/RateBadge';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('RateBadge', () => {
  it('muestra el monto convertido con la fuente de la tasa', async () => {
    const screen = await renderWithTheme(
      <RateBadge
        convertedAmountMinor={19099}
        currency="USD"
        source="BCV"
        testID="rate-badge"
      />,
    );

    expect(screen.getByTestId('rate-badge')).toHaveTextContent(
      '≈ $ 190,99 · BCV',
    );
  });

  it('avisa cuando la tasa mostrada no es la de hoy', async () => {
    const screen = await renderWithTheme(
      <RateBadge
        convertedAmountMinor={19099}
        currency="USD"
        source="BCV"
        stale
        testID="rate-badge"
      />,
    );

    expect(screen.getByTestId('rate-badge')).toHaveTextContent(
      '≈ $ 190,99 · BCV · tasa no actualizada hoy',
    );
  });

  it('admite una conversión histórica con tasa personalizada', async () => {
    const screen = await renderWithTheme(
      <RateBadge
        convertedAmountMinor={250000}
        currency="VES"
        source="CUSTOM"
        testID="rate-badge"
      />,
    );

    expect(screen.getByTestId('rate-badge')).toHaveTextContent(
      '≈ Bs. 2.500 · Personalizada',
    );
  });
});
