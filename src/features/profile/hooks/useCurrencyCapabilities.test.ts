import { renderHook } from '@testing-library/react-native';

import { useProfileCountry } from '@/features/profile/hooks/useProfileCountry';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';

jest.mock('@/features/profile/hooks/useProfileCountry');

function mockCountryCode(countryCode: string | null) {
  jest.mocked(useProfileCountry).mockReturnValue({
    countryCode,
    isSaving: false,
    error: null,
    errorCode: null,
    saveCountry: jest.fn(),
    dismissError: jest.fn(),
  });
}

describe('useCurrencyCapabilities', () => {
  it('activa todas las capacidades cuando el país es Venezuela', async () => {
    mockCountryCode('VE');

    const { result } = await renderHook(() => useCurrencyCapabilities());

    expect(result.current).toEqual({
      accountingCurrency: 'USD',
      allowedTransactionInputCurrencies: ['USD', 'VES'],
      allowsMultipleAccountCurrencies: false,
      countryCode: 'VE',
      venezuelaCurrencyMode: true,
      customExchangeRate: true,
      multiRateMovementDisplay: true,
    });
  });

  it('desactiva todas las capacidades para otro país', async () => {
    mockCountryCode('ES');

    const { result } = await renderHook(() => useCurrencyCapabilities());

    expect(result.current).toEqual({
      accountingCurrency: undefined,
      allowedTransactionInputCurrencies: undefined,
      allowsMultipleAccountCurrencies: true,
      countryCode: 'ES',
      venezuelaCurrencyMode: false,
      customExchangeRate: false,
      multiRateMovementDisplay: false,
    });
  });

  it('desactiva todas las capacidades cuando todavía no hay país guardado', async () => {
    mockCountryCode(null);

    const { result } = await renderHook(() => useCurrencyCapabilities());

    expect(result.current.venezuelaCurrencyMode).toBe(false);
  });
});
