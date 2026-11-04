import {
  clearCurrentExchangeRatesCache,
  getCurrentExchangeRates,
  peekCurrentExchangeRates,
  previewExchangeRate,
} from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
import { getLocalTodayKey } from '@/lib/date/localDate';
import { ApiError } from '@/services/api/client';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockedGet = jest.mocked(apiClient.get);
const mockedPost = jest.mocked(apiClient.post);

const currentRates = {
  rates: {
    BCV: {
      source: 'BCV',
      baseCurrency: 'USD',
      quoteCurrency: 'VES',
      rate: '50.0000000000',
      observedAt: '2026-09-01T04:00:00.000Z',
      fetchedAt: '2026-08-31T20:00:00.000Z',
    },
    EURO: {
      source: 'EURO',
      baseCurrency: 'EUR',
      quoteCurrency: 'VES',
      rate: '60.0000000000',
      observedAt: '2026-09-01T04:00:00.000Z',
      fetchedAt: '2026-08-31T20:00:00.000Z',
    },
  },
  ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
  stale: false,
};

describe('juntossExchangeRateGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCurrentExchangeRatesCache();
  });

  it('lee las dos tasas vigentes desde la ruta real del backend', async () => {
    mockedGet.mockResolvedValue({ data: currentRates });

    // Una API sin la fuente USDT deja esa tasa como no disponible.
    await expect(getCurrentExchangeRates()).resolves.toEqual({
      ...currentRates,
      rates: { ...currentRates.rates, USDT: null },
    });
    expect(mockedGet).toHaveBeenCalledWith('/v1/exchange/rates');
  });

  it('lee la tasa USDT con su promedio diario y su antigüedad', async () => {
    const usdt = {
      source: 'USDT',
      baseCurrency: 'USDT',
      quoteCurrency: 'VES',
      rate: '1010.0229500000',
      dailyAverage: '1008.8891290000',
      observedAt: '2026-11-04T15:05:02.510Z',
      fetchedAt: '2026-11-04T15:30:00.000Z',
      stale: false,
    };
    mockedGet.mockResolvedValue({
      data: { ...currentRates, rates: { ...currentRates.rates, USDT: usdt } },
    });

    const rates = await getCurrentExchangeRates();

    expect(rates.rates.USDT).toEqual(usdt);
    expect(rates.rates.BCV.rate).toBe('50.0000000000');
  });

  it.each([
    ['caída', null],
    ['malformada', { source: 'USDT', baseCurrency: 'USDT', rate: 1010 }],
  ])(
    'una fuente USDT %s queda como no disponible sin tumbar BCV ni EUR',
    async (_case, usdt) => {
      mockedGet.mockResolvedValue({
        data: {
          ...currentRates,
          rates: { ...currentRates.rates, USDT: usdt },
        },
      });

      const rates = await getCurrentExchangeRates();

      expect(rates.rates.USDT).toBeNull();
      expect(rates.rates.EURO.rate).toBe('60.0000000000');
    },
  );

  it('pide el preview con las tasas de una fecha pasada y no envía la de hoy', async () => {
    mockedPost.mockResolvedValue({
      data: {
        conversions: {
          BCV: { amount: '500.00', currency: 'VES', rate: '50.0000000000' },
          EURO: { amount: '600.00', currency: 'VES', rate: '60.0000000000' },
        },
        ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      },
    });

    await previewExchangeRate({
      amountMinor: 100_000,
      fromCurrency: 'USD',
      occurredOn: '2026-08-15',
    });
    await previewExchangeRate({
      amountMinor: 100_000,
      fromCurrency: 'USD',
      occurredOn: getLocalTodayKey(),
    });

    expect(mockedPost).toHaveBeenNthCalledWith(1, '/v1/exchange/preview', {
      amount: '1000.00',
      countryCode: 'VE',
      currency: 'USD',
      occurredOn: '2026-08-15',
    });
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/v1/exchange/preview', {
      amount: '1000.00',
      countryCode: 'VE',
      currency: 'USD',
    });
  });

  it('comparte la petición en curso y reutiliza las tasas unos minutos', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    mockedGet.mockResolvedValue({ data: currentRates });

    await Promise.all([getCurrentExchangeRates(), getCurrentExchangeRates()]);
    await getCurrentExchangeRates();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(peekCurrentExchangeRates()).toEqual({
      ...currentRates,
      rates: { ...currentRates.rates, USDT: null },
    });

    now.mockReturnValue(1_000_000 + 5 * 60 * 1000);
    expect(peekCurrentExchangeRates()).toBeNull();
    await getCurrentExchangeRates();
    expect(mockedGet).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it('envía el importe decimal y normaliza las conversiones a unidades menores', async () => {
    mockedPost.mockResolvedValue({
      data: {
        conversions: {
          BCV: { amount: '200.00', currency: 'USD', rate: '50.0000000000' },
          EURO: { amount: '166.67', currency: 'USD', rate: '60.0000000000' },
        },
        ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      },
    });

    await expect(
      previewExchangeRate({ amountMinor: 1_000_000, fromCurrency: 'VES' }),
    ).resolves.toEqual({
      conversions: {
        BCV: { amountMinor: 20_000, currency: 'USD', rate: '50.0000000000' },
        EURO: { amountMinor: 16_667, currency: 'USD', rate: '60.0000000000' },
        USDT: null,
      },
      ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
    });
    expect(mockedPost).toHaveBeenCalledWith('/v1/exchange/preview', {
      amount: '10000.00',
      countryCode: 'VE',
      currency: 'VES',
    });
  });

  it('muestra dos equivalencias en bolívares al partir de USD, una por cada tasa BCV', async () => {
    mockedPost.mockResolvedValue({
      data: {
        conversions: {
          BCV: { amount: '500.00', currency: 'VES', rate: '50.0000000000' },
          EURO: { amount: '600.00', currency: 'VES', rate: '60.0000000000' },
        },
        ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      },
    });

    await expect(
      previewExchangeRate({ amountMinor: 100_000, fromCurrency: 'USD' }),
    ).resolves.toEqual({
      conversions: {
        BCV: { amountMinor: 50_000, currency: 'VES', rate: '50.0000000000' },
        EURO: { amountMinor: 60_000, currency: 'VES', rate: '60.0000000000' },
        USDT: null,
      },
      ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
    });
    expect(mockedPost).toHaveBeenCalledWith('/v1/exchange/preview', {
      amount: '1000.00',
      countryCode: 'VE',
      currency: 'USD',
    });
  });

  it('si el servidor rechaza la fecha del preview, reintenta sin ella y no la vuelve a enviar', async () => {
    const preview = {
      data: {
        conversions: {
          BCV: { amount: '2.00', currency: 'USD', rate: '50.0000000000' },
          EURO: { amount: '1.67', currency: 'USD', rate: '60.0000000000' },
          USDT: { amount: '1.82', currency: 'USDT', rate: '55.0000000000' },
        },
        ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      },
    };
    mockedPost
      .mockRejectedValueOnce(
        new ApiError({
          status: 400,
          code: 'INVALID_REQUEST',
          message: 'Petición inválida',
        }),
      )
      .mockResolvedValue(preview);
    const pastPreview = {
      amountMinor: 10_000,
      fromCurrency: 'VES' as const,
      occurredOn: '2026-08-15',
    };

    const result = await previewExchangeRate(pastPreview);
    await previewExchangeRate(pastPreview);

    expect(result.conversions.USDT).toEqual({
      amountMinor: 182,
      currency: 'USDT',
      rate: '55.0000000000',
    });
    expect(mockedPost).toHaveBeenCalledTimes(3);
    expect(mockedPost.mock.calls[0]![1]).toHaveProperty('occurredOn');
    expect(mockedPost.mock.calls[1]![1]).not.toHaveProperty('occurredOn');
    expect(mockedPost.mock.calls[2]![1]).not.toHaveProperty('occurredOn');
  });

  it('lee la equivalencia USDT del preview, en Bs desde USD', async () => {
    mockedPost.mockResolvedValue({
      data: {
        conversions: {
          BCV: { amount: '500.00', currency: 'VES', rate: '50.0000000000' },
          EURO: { amount: '600.00', currency: 'VES', rate: '60.0000000000' },
          USDT: { amount: '550.00', currency: 'VES', rate: '55.0000000000' },
        },
        ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      },
    });

    const preview = await previewExchangeRate({
      amountMinor: 1_000,
      fromCurrency: 'USD',
    });

    expect(preview.conversions.USDT).toEqual({
      amountMinor: 55_000,
      currency: 'VES',
      rate: '55.0000000000',
    });
  });

  it('rechaza una respuesta de tasa EUR que cambia la moneda de salida', async () => {
    mockedPost.mockResolvedValue({
      data: {
        conversions: {
          BCV: { amount: '500.00', currency: 'VES', rate: '50.0000000000' },
          EURO: { amount: '8.33', currency: 'EUR', rate: '60.0000000000' },
        },
        ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      },
    });

    await expect(
      previewExchangeRate({ amountMinor: 100_000, fromCurrency: 'USD' }),
    ).rejects.toThrow('Moneda inesperada en EURO: EUR');
  });
});
