import { renderHook, waitFor } from '@testing-library/react-native';

import { previewExchangeRate } from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
import { useExchangePreview } from '@/features/exchangeRates/hooks/useExchangePreview';

jest.mock(
  '@/features/exchangeRates/gateways/juntossExchangeRateGateway',
  () => ({
    previewExchangeRate: jest.fn(),
  }),
);

const mockedPreview = jest.mocked(previewExchangeRate);
const preview = {
  conversions: {
    BCV: {
      amountMinor: 20_000,
      currency: 'USD' as const,
      rate: '50.0000000000',
    },
    EURO: {
      amountMinor: 16_667,
      currency: 'EUR' as const,
      rate: '60.0000000000',
    },
  },
  ratesUpdatedAt: '2026-08-31T20:00:00.000Z',
};

describe('useExchangePreview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('permanece idle sin importe', async () => {
    const { result } = await renderHook(() =>
      useExchangePreview({ amountMinor: 0, fromCurrency: 'VES' }),
    );
    expect(result.current).toEqual({ status: 'idle' });
  });

  it('usa la equivalencia BCV tras el debounce', async () => {
    mockedPreview.mockResolvedValue(preview);
    const { result } = await renderHook(() =>
      useExchangePreview({ amountMinor: 1_000_000, fromCurrency: 'VES' }),
    );

    await waitFor(() => expect(result.current.status).toBe('success'), {
      timeout: 2000,
    });
    expect(mockedPreview).toHaveBeenCalledWith({
      amountMinor: 1_000_000,
      fromCurrency: 'VES',
    });
    expect(result.current).toMatchObject({
      convertedAmountMinor: 20_000,
      toCurrency: 'USD',
    });
  });

  it('expone error si el backend falla', async () => {
    mockedPreview.mockRejectedValue(new Error('502'));
    const { result } = await renderHook(() =>
      useExchangePreview({ amountMinor: 1_000_000, fromCurrency: 'USD' }),
    );
    await waitFor(() => expect(result.current.status).toBe('error'), {
      timeout: 2000,
    });
  });
});
