import type { MoneyAccount } from '@/features/accounts/types';
import {
  filterByVisibleCurrencies,
  filterMoneyAccountsByVisibleCurrencies,
  listSpaceCurrencies,
} from '@/features/spaces/utils/spaceCurrencies';

describe('listSpaceCurrencies', () => {
  it('solo ofrece las monedas activas de la persona en su espacio', () => {
    // Quitar una moneda en Ajustes debe ocultarla aunque el espacio naciera
    // en ella o guarde movimientos suyos.
    expect(listSpaceCurrencies(['USD'])).toEqual(['USD']);
  });

  it('integra la moneda de la otra persona del espacio', () => {
    // Ana en VES, Beto en EUR: los dos tienen que ver las dos monedas o cada
    // uno perdería de vista los movimientos del otro.
    expect(listSpaceCurrencies(['VES'], ['EUR'])).toEqual(['VES', 'EUR']);
  });

  it('no duplica una moneda compartida por ambos', () => {
    expect(listSpaceCurrencies(['EUR'], ['EUR'])).toEqual(['EUR']);
  });

  it('ignora a los miembros de los que aún no se conoce la moneda', () => {
    expect(listSpaceCurrencies(['EUR'], [null])).toEqual(['EUR']);
  });

  it('conserva el orden en que la persona eligió sus propias monedas', () => {
    expect(listSpaceCurrencies(['EUR', 'USD', 'GBP'])).toEqual([
      'EUR',
      'USD',
      'GBP',
    ]);
  });

  it('no aplica el tope de monedas activas, que limita a la persona y no al espacio', () => {
    expect(listSpaceCurrencies(['EUR', 'USD', 'GBP'], ['ARS', 'VES'])).toEqual([
      'EUR',
      'USD',
      'GBP',
      'ARS',
      'VES',
    ]);
  });
});

describe('filtros por monedas visibles', () => {
  const visible = new Set(['USD']);

  it('oculta los movimientos de monedas desactivadas', () => {
    expect(
      filterByVisibleCurrencies(
        [
          { id: 'a', currency: 'USD' },
          { id: 'b', currency: 'EUR' },
        ],
        visible,
      ),
    ).toEqual([{ id: 'a', currency: 'USD' }]);
  });

  it('oculta saldos desactivados y las cuentas que se quedan sin ninguno', () => {
    const account = (
      id: string,
      currencies: readonly MoneyAccount['balances'][number]['currency'][],
    ): MoneyAccount => ({
      id,
      spaceId: 'space',
      name: id,
      kind: 'cash',
      icon: 'money',
      colorToken: 'forest',
      balances: currencies.map((currency, position) => ({
        currency,
        openingBalanceMinor: 100,
        position,
      })),
      isArchived: false,
    });
    const usdOnly = account('usd', ['USD']);

    expect(
      filterMoneyAccountsByVisibleCurrencies(
        [usdOnly, account('mixed', ['EUR', 'USD']), account('eur', ['EUR'])],
        visible,
      ),
    ).toEqual([
      usdOnly,
      expect.objectContaining({
        id: 'mixed',
        balances: [expect.objectContaining({ currency: 'USD' })],
      }),
    ]);
  });
});
