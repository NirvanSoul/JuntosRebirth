import { listCustomExchangeRates } from '@/features/exchangeRates/gateways/juntossCustomExchangeRateGateway';
import {
  getCurrentExchangeRates,
  previewExchangeRate,
} from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
import { apiClient } from '@/services/api/juntossApiClient';
import {
  resetDemoSessionStoreForTests,
  saveDemoSession,
} from '@/state/demoSession/demoSessionStore';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

describe('tasas con el usuario demo venezolano', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetDemoSessionStoreForTests();
    await saveDemoSession({
      userId: 'demo-self',
      displayName: 'Valeria',
      email: 'valeria@demo.juntoss.invalid',
      partnerUserId: 'demo-partner',
      partnerDisplayName: 'Andrés',
      currency: 'VES',
      createdAt: '2026-10-17T10:00:00.000Z',
      previousCurrencyPreferences: null,
    });
  });

  afterAll(() => resetDemoSessionStoreForTests());

  it('responde tasas y previews ficticios sin llamar a la API', async () => {
    const rates = await getCurrentExchangeRates();
    const preview = await previewExchangeRate({
      amountMinor: 1_000,
      fromCurrency: 'USD',
    });

    expect(Number(rates.rates.BCV.rate)).toBeGreaterThan(0);
    expect(rates.rates.EURO.baseCurrency).toBe('EUR');
    expect(preview.conversions.BCV.currency).toBe('VES');
    expect(preview.conversions.BCV.amountMinor).toBe(
      Math.round(1_000 * Number(preview.conversions.BCV.rate)),
    );
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('no tiene tasas personalizadas', async () => {
    await expect(listCustomExchangeRates()).resolves.toEqual([]);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
