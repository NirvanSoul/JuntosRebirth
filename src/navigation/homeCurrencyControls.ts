import { useCallback } from 'react';

import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getCurrencyFlag } from '@/lib/currency/currencyCatalog';

const venezuelaHomeCurrencies: readonly CurrencyCode[] = ['USD', 'VES'];

export function resolveHomeCurrencies(
  spaceCurrencies: readonly CurrencyCode[],
  venezuelaCurrencyMode: boolean,
): readonly CurrencyCode[] {
  return venezuelaCurrencyMode ? venezuelaHomeCurrencies : spaceCurrencies;
}

export function getNextHomeCurrency(
  currencies: readonly CurrencyCode[],
  currentCurrency: CurrencyCode,
): CurrencyCode | undefined {
  return currencies.find((currency) => currency !== currentCurrency);
}

export function getHomeCurrencyButtonLabel(
  currency: CurrencyCode,
  venezuelaCurrencyMode: boolean,
): string {
  if (!venezuelaCurrencyMode) return getCurrencyFlag(currency);
  return currency === 'VES' ? 'Bs' : '$';
}

export function useHomeCurrencyPress({
  currencies,
  currentCurrency,
  onOpenPicker,
  onSaveError,
  setSelectedCurrency,
}: {
  currencies: readonly CurrencyCode[];
  currentCurrency: CurrencyCode;
  onOpenPicker: () => void;
  onSaveError: () => void;
  setSelectedCurrency: (currency: CurrencyCode) => Promise<void>;
}): () => void {
  return useCallback(() => {
    if (currencies.length === 2) {
      const nextCurrency = getNextHomeCurrency(currencies, currentCurrency);
      if (nextCurrency)
        void setSelectedCurrency(nextCurrency).catch(onSaveError);
      return;
    }

    if (currencies.length >= 3) onOpenPicker();
  }, [
    currencies,
    currentCurrency,
    onOpenPicker,
    onSaveError,
    setSelectedCurrency,
  ]);
}
