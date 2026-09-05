import {
  getCurrentExchangeRates,
  previewExchangeRate,
} from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
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
  beforeEach(() => jest.clearAllMocks());

  it('lee las dos tasas vigentes desde la ruta real del backend', async () => {
    mockedGet.mockResolvedValue({ data: currentRates });

    await expect(getCurrentExchangeRates()).resolves.toEqual(currentRates);
    expect(mockedGet).toHaveBeenCalledWith('/v1/exchange/rates');
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
      },
      ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
    });
    expect(mockedPost).toHaveBeenCalledWith('/v1/exchange/preview', {
      amount: '1000.00',
      countryCode: 'VE',
      currency: 'USD',
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
