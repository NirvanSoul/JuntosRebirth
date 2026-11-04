import { readRemoteExchangeSnapshot } from '@/features/sync/gateways/remoteExchangeSnapshot';

const bcvRow = {
  baseCurrency: 'USD',
  quoteCurrency: 'VES',
  rate: '893.2173000000',
  convertedAmountMinor: '1000',
  convertedCurrency: 'USD',
  observedAt: '2026-11-04T04:00:00.000Z',
};

const usdtRow = {
  baseCurrency: 'USDT',
  quoteCurrency: 'VES',
  rate: '1008.8891290000',
  convertedAmountMinor: '9912',
  convertedCurrency: 'USDT',
  observedAt: '2026-11-04T15:05:02.510Z',
  precision: 'intraday',
};

function snapshot(rates: Record<string, unknown>) {
  return { countryCode: 'VE', createdWithCurrency: 'VES', rates };
}

describe('readRemoteExchangeSnapshot', () => {
  it('lee la fila USDT de un movimiento en VES, que convierte a USDT', () => {
    const parsed = readRemoteExchangeSnapshot(
      snapshot({ BCV: bcvRow, USDT: usdtRow }),
    );

    expect(parsed?.rates.USDT).toEqual({
      baseCurrency: 'USDT',
      quoteCurrency: 'VES',
      rate: '1008.8891290000',
      convertedAmountMinor: 9912,
      convertedCurrency: 'USDT',
      observedAt: '2026-11-04T15:05:02.510Z',
    });
    expect(parsed?.rates.BCV?.convertedAmountMinor).toBe(1000);
  });

  it('descarta una fila USDT rota sin tumbar el resto del snapshot', () => {
    const parsed = readRemoteExchangeSnapshot(
      snapshot({ BCV: bcvRow, USDT: { ...usdtRow, rate: 1008 } }),
    );

    expect(parsed?.rates.USDT).toBeUndefined();
    expect(parsed?.rates.BCV).toBeDefined();
  });

  it('sigue rechazando una fila BCV rota, que sostiene los saldos', () => {
    expect(() =>
      readRemoteExchangeSnapshot(snapshot({ BCV: { ...bcvRow, rate: 893 } })),
    ).toThrow('[sync] Tasa histórica inválida');
  });

  it('solo admite USDT como moneda convertida en la fila USDT', () => {
    expect(() =>
      readRemoteExchangeSnapshot(
        snapshot({ BCV: { ...bcvRow, convertedCurrency: 'USDT' } }),
      ),
    ).toThrow('[sync] Tasa histórica inválida');
  });

  it('ignora fuentes desconocidas', () => {
    const parsed = readRemoteExchangeSnapshot(
      snapshot({ BCV: bcvRow, FUTURA: { rate: '1' } }),
    );

    expect(Object.keys(parsed!.rates)).toEqual(['BCV']);
  });
});
