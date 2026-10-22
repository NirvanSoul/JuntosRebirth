import { renderHook, waitFor } from '@testing-library/react-native';

import {
  getCurrentExchangeRates,
  peekCurrentExchangeRates,
} from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';

jest.mock(
  '@/features/exchangeRates/gateways/juntossExchangeRateGateway',
  () => ({
    getCurrentExchangeRates: jest.fn(),
    peekCurrentExchangeRates: jest.fn(() => null),
  }),
);

const mockedGetCurrent = jest.mocked(getCurrentExchangeRates);

describe('useExchangeRates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('expone BCV y Euro y conserva la bandera stale', async () => {
    mockedGetCurrent.mockResolvedValue({
      rates: {
        BCV: {
          source: 'BCV',
          baseCurrency: 'USD',
          quoteCurrency: 'VES',
          rate: '50',
          observedAt: '2026-09-01T04:00:00.000Z',
          fetchedAt: '2026-08-31T20:00:00.000Z',
        },
        EURO: {
          source: 'EURO',
          baseCurrency: 'EUR',
          quoteCurrency: 'VES',
          rate: '60',
          observedAt: '2026-09-01T04:00:00.000Z',
          fetchedAt: '2026-08-31T20:00:00.000Z',
        },
      },
      ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      stale: true,
    });

    const { result } = await renderHook(useExchangeRates);

    await waitFor(() => expect(result.current.status).toBe('stale'));
    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);
  });

  it('expone error si el backend falla', async () => {
    mockedGetCurrent.mockRejectedValue(new Error('502'));
    const { result } = await renderHook(useExchangeRates);
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
  it('abre directamente con las tasas en memoria, sin estado de carga', async () => {
    const cachedRates = {
      rates: {
        BCV: {
          source: 'BCV' as const,
          baseCurrency: 'USD' as const,
          quoteCurrency: 'VES' as const,
          rate: '50',
          observedAt: '2026-09-01T04:00:00.000Z',
          fetchedAt: '2026-08-31T20:00:00.000Z',
        },
        EURO: {
          source: 'EURO' as const,
          baseCurrency: 'EUR' as const,
          quoteCurrency: 'VES' as const,
          rate: '60',
          observedAt: '2026-09-01T04:00:00.000Z',
          fetchedAt: '2026-08-31T20:00:00.000Z',
        },
      },
      ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
      stale: false,
    };
    jest.mocked(peekCurrentExchangeRates).mockReturnValue(cachedRates);

    const { result } = await renderHook(() => useExchangeRates());

    expect(result.current).toEqual({ status: 'success', rates: cachedRates });
    expect(mockedGetCurrent).not.toHaveBeenCalled();
    jest.mocked(peekCurrentExchangeRates).mockReturnValue(null);
  });
});
