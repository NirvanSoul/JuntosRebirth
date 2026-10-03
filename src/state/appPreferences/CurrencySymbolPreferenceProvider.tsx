import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  formatCurrency as formatCurrencyValue,
  type FormatCurrencyOptions,
} from '@/lib/currency/formatCurrency';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { defaultCurrencySymbolPreference } from '@/state/appPreferences/currencySymbolPreference';
import {
  loadCurrencySymbolPreference,
  saveCurrencySymbolPreference,
} from '@/state/appPreferences/currencySymbolPreferenceRepository';

type CurrencyFormatter = (
  amountMinor: number,
  currency: CurrencyCode,
  locale: string,
  options?: FormatCurrencyOptions,
) => string;

export type CurrencySymbolPreferenceContextValue = {
  formatCurrency: CurrencyFormatter;
  showCurrencySymbols: boolean;
  setShowCurrencySymbols: (show: boolean) => Promise<void>;
};

export const defaultCurrencySymbolPreferenceContextValue: CurrencySymbolPreferenceContextValue =
  {
    formatCurrency: formatCurrencyValue,
    showCurrencySymbols: defaultCurrencySymbolPreference.showCurrencySymbols,
    setShowCurrencySymbols: async () => undefined,
  };

const CurrencySymbolPreferenceContext =
  createContext<CurrencySymbolPreferenceContextValue>(
    defaultCurrencySymbolPreferenceContextValue,
  );

export function CurrencySymbolPreferenceScope({
  children,
  value,
}: PropsWithChildren<{ value: CurrencySymbolPreferenceContextValue }>) {
  return (
    <CurrencySymbolPreferenceContext.Provider value={value}>
      {children}
    </CurrencySymbolPreferenceContext.Provider>
  );
}

type CurrencySymbolPreferenceProviderProps = PropsWithChildren<{
  accountId: string;
}>;

export function CurrencySymbolPreferenceProvider({
  accountId,
  children,
}: CurrencySymbolPreferenceProviderProps) {
  const [showCurrencySymbols, setShowCurrencySymbolsState] = useState(
    defaultCurrencySymbolPreference.showCurrencySymbols,
  );
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadCurrencySymbolPreference(accountId).then((stored) => {
      if (!isMounted) return;
      setShowCurrencySymbolsState(stored.showCurrencySymbols);
      setReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [accountId]);

  const setShowCurrencySymbols = useCallback(
    async (show: boolean) => {
      await saveCurrencySymbolPreference(accountId, {
        showCurrencySymbols: show,
      });
      setShowCurrencySymbolsState(show);
    },
    [accountId],
  );

  const formatCurrency = useCallback<CurrencyFormatter>(
    (amountMinor, currency, locale, options = {}) =>
      formatCurrencyValue(amountMinor, currency, locale, {
        ...options,
        showCurrencySymbol: showCurrencySymbols,
      }),
    [showCurrencySymbols],
  );

  const value = useMemo(
    () => ({
      formatCurrency,
      setShowCurrencySymbols,
      showCurrencySymbols,
    }),
    [formatCurrency, setShowCurrencySymbols, showCurrencySymbols],
  );

  if (!isReady) return null;

  return (
    <CurrencySymbolPreferenceScope value={value}>
      {children}
    </CurrencySymbolPreferenceScope>
  );
}

export function useCurrencySymbolPreference(): CurrencySymbolPreferenceContextValue {
  return useContext(CurrencySymbolPreferenceContext);
}
