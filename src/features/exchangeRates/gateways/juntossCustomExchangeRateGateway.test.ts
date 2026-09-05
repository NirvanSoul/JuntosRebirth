import {
  createCustomExchangeRate,
  listCustomExchangeRates,
} from '@/features/exchangeRates/gateways/juntossCustomExchangeRateGateway';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('juntossCustomExchangeRateGateway', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lista tasas USD/VES de la persona autenticada', async () => {
    jest.mocked(apiClient.get).mockResolvedValue({
      data: {
        rates: [
          {
            id: 'rate-1',
            name: 'Mi tasa',
            baseCurrency: 'USD',
            quoteCurrency: 'VES',
            rate: '50.5',
            isDefault: true,
            createdAt: '2026-09-04T00:00:00.000Z',
          },
        ],
      },
    });
    await expect(listCustomExchangeRates()).resolves.toHaveLength(1);
    expect(apiClient.get).toHaveBeenCalledWith('/v1/exchange/custom-rates');
  });

  it('crea una tasa sin enviar divisas controladas por el servidor', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        rate: {
          id: 'rate-1',
          name: 'Mi tasa',
          baseCurrency: 'USD',
          quoteCurrency: 'VES',
          rate: '50.5',
          isDefault: false,
          createdAt: '2026-09-04T00:00:00.000Z',
        },
      },
    });
    await createCustomExchangeRate({ name: 'Mi tasa', rate: '50.5' });
    expect(apiClient.post).toHaveBeenCalledWith('/v1/exchange/custom-rates', {
      name: 'Mi tasa',
      rate: '50.5',
    });
  });
});
