import { listSpaceCurrencies } from '@/features/spaces/utils/spaceCurrencies';

describe('listSpaceCurrencies', () => {
  it('pone primero la moneda del espacio, que es donde están sus movimientos', () => {
    expect(listSpaceCurrencies('VES', ['EUR'])).toEqual(['VES', 'EUR']);
  });

  it('integra la moneda de la otra persona del espacio', () => {
    // El caso que motivó todo: Ana en VES, Beto en EUR. Los dos tienen que ver
    // las dos monedas o cada uno perdería de vista los movimientos del otro.
    expect(listSpaceCurrencies('VES', ['VES'], ['EUR'])).toEqual([
      'VES',
      'EUR',
    ]);
  });

  it('no duplica una moneda compartida por ambos', () => {
    expect(listSpaceCurrencies('EUR', ['EUR'], ['EUR'])).toEqual(['EUR']);
  });

  it('ignora a los miembros de los que aún no se conoce la moneda', () => {
    expect(listSpaceCurrencies('EUR', ['EUR'], [null])).toEqual(['EUR']);
  });

  it('conserva el orden en que la persona eligió sus propias monedas', () => {
    expect(listSpaceCurrencies('EUR', ['EUR', 'USD', 'GBP'])).toEqual([
      'EUR',
      'USD',
      'GBP',
    ]);
  });

  it('no aplica el tope de monedas activas, que limita a la persona y no al espacio', () => {
    const currencies = listSpaceCurrencies(
      'VES',
      ['EUR', 'USD', 'GBP'],
      ['ARS'],
    );

    expect(currencies).toEqual(['VES', 'EUR', 'USD', 'GBP', 'ARS']);
  });
});
