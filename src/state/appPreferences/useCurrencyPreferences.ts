import { useCallback, useEffect, useState } from 'react';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnDefaultCurrency } from '@/features/profile/services/syncOwnDefaultCurrency';
import {
  loadCurrencyPreferences,
  loadStoredCurrencyPreferences,
  saveCurrencyPreferences,
} from '@/state/appPreferences/currencyPreferencesRepository';
import {
  currencyPreferencesForCountry,
  defaultCurrencyPreferences,
  type CurrencyPreferences,
} from '@/state/appPreferences/currencyPreferences';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

type CurrencyPreferencesController = {
  activeCurrencies: readonly CurrencyCode[];
  error: string | null;
  isReady: boolean;
  preferences: CurrencyPreferences;
  reloadCurrencyPreferences: () => Promise<void>;
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

    void loadStoredCurrencyPreferences()
      .then(async (stored) => {
        if (stored) {
          if (!isMounted) return;
          setPreferences(stored);
          const defaultCurrency = stored.currencies[0];
          if (defaultCurrency) void syncOwnDefaultCurrency(defaultCurrency);
          return;
        }
        // Sin preferencias guardadas manda el país del perfil. No se publica
        // nada: el EUR por defecto del catálogo no es una elección y no debe
        // llegar al perfil remoto que ven los demás miembros.
        const { countryCode } = await getLocalProfile().catch(() => ({
          countryCode: null,
        }));
        const countryPreferences = countryCode
          ? currencyPreferencesForCountry(countryCode)
          : null;
        if (isMounted && countryPreferences) setPreferences(countryPreferences);
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
      const defaultCurrency = next.currencies[0];
      if (defaultCurrency) void syncOwnDefaultCurrency(defaultCurrency);
      setError(null);
    },
    [],
  );

  const reloadCurrencyPreferences = useCallback(async (): Promise<void> => {
    const stored = await loadCurrencyPreferences();
    setPreferences(stored);
    setError(null);
  }, []);

  return {
    activeCurrencies: preferences.currencies,
    error,
    isReady,
    preferences,
    reloadCurrencyPreferences,
    setCurrencyPreferences,
  };
}
