import { useCallback, useEffect, useState } from 'react';

import {
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from '@/state/appPreferences/currencyPreferencesRepository';
import {
  defaultCurrencyPreferences,
  type CurrencyPreferences,
} from '@/state/appPreferences/currencyPreferences';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

type CurrencyPreferencesController = {
  activeCurrencies: readonly CurrencyCode[];
  error: string | null;
  isReady: boolean;
  preferences: CurrencyPreferences;
  setCurrencyPreferences: (next: CurrencyPreferences) => Promise<void>;
};

export function useCurrencyPreferences(): CurrencyPreferencesController {
  const [preferences, setPreferences] = useState<CurrencyPreferences>(
    defaultCurrencyPreferences,
  );
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadCurrencyPreferences()
      .then((stored) => {
        if (isMounted) setPreferences(stored);
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setCurrencyPreferences = useCallback(
    async (next: CurrencyPreferences): Promise<void> => {
      try {
        await saveCurrencyPreferences(next);
      } catch {
        const message = 'No pudimos guardar tus monedas. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setPreferences(next);
      setError(null);
    },
    [],
  );

  return {
    activeCurrencies: preferences.currencies,
    error,
    isReady,
    preferences,
    setCurrencyPreferences,
  };
}
