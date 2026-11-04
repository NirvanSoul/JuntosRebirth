import {
  clearVenezuelaRateHistoryCache,
  getFirstVenezuelaRateDate,
  getVenezuelaRatesAt,
} from '@/features/exchangeRates/gateways/juntossVenezuelaRateHistoryGateway';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn() },
}));

const mockedGet = jest.mocked(apiClient.get);

describe('juntossVenezuelaRateHistoryGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearVenezuelaRateHistoryCache();
  });

  it('lee las tres tasas de un día pasado y las recuerda', async () => {
    mockedGet.mockResolvedValue({
      data: {
        date: '2026-09-11',
        time: '14:30',
        bcv: {
          effectiveDate: '2026-09-11',
          usd: '832.4900000000',
          eur: '968.0700000000',
        },
        usdt: {
          rate: '960.8200000000',
          precision: 'daily_average',
          observedAt: null,
        },
      },
    });

    await expect(getVenezuelaRatesAt('2026-09-11', '14:30')).resolves.toEqual({
      bcvUsd: '832.4900000000',
      bcvEur: '968.0700000000',
      usdt: {
        rate: '960.8200000000',
        precision: 'daily_average',
        observedAt: null,
      },
    });
    await getVenezuelaRatesAt('2026-09-11', '14:30');

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith(
      '/v1/exchange/rates/at?date=2026-09-11&time=14:30',
    );
  });

  it('deja en null las tasas que ese día no existen', async () => {
    mockedGet.mockResolvedValue({
      data: { date: '2026-01-10', time: null, bcv: null, usdt: null },
    });

    await expect(getVenezuelaRatesAt('2026-01-10')).resolves.toEqual({
      bcvUsd: null,
      bcvEur: null,
      usdt: null,
    });
  });

  it('toma como límite el primer día con tasa USDT, no el primero con BCV', async () => {
    mockedGet.mockResolvedValue({
      data: {
        rates: [
          {
            date: '2026-01-02',
            bcvUsd: '300.10',
            bcvEur: '350.00',
            usdtDailyAverage: null,
          },
          {
            date: '2026-01-19',
            bcvUsd: '330.00',
            bcvEur: '380.00',
            usdtDailyAverage: '420.50',
          },
        ],
      },
    });

    await expect(getFirstVenezuelaRateDate()).resolves.toBe('2026-01-19');
    expect(mockedGet).toHaveBeenCalledWith(
      '/v1/exchange/rates/history?from=2026-01-01&to=2026-01-31',
    );
  });

  it('si el historial falla, usa el primer día con USDT conocido', async () => {
    mockedGet.mockRejectedValue(new Error('sin red'));

    await expect(getFirstVenezuelaRateDate()).resolves.toBe('2026-01-19');
  });
});
