import { useCallback, useEffect, useState } from 'react';

import {
  loadHomeCurrencySelection,
  saveHomeCurrencySelection,
} from '@/state/appPreferences/homeCurrencySelectionRepository';
import {
  defaultHomeCurrencySelection,
  type HomeCurrencySelection,
} from '@/state/appPreferences/homeCurrencySelection';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

type HomeCurrencySelectionController = {
  error: string | null;
  isReady: boolean;
  selectedCurrency: CurrencyCode | null;
  setSelectedCurrency: (currency: CurrencyCode) => Promise<void>;
};

export function useHomeCurrencySelection(): HomeCurrencySelectionController {
  const [selection, setSelection] = useState<HomeCurrencySelection>(
    defaultHomeCurrencySelection,
  );
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadHomeCurrencySelection()
      .then((stored) => {
        if (isMounted) setSelection(stored);
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setSelectedCurrency = useCallback(
    async (currency: CurrencyCode): Promise<void> => {
      const next: HomeCurrencySelection = { currency };
      try {
        await saveHomeCurrencySelection(next);
      } catch {
        const message = 'No pudimos guardar la moneda. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setSelection(next);
      setError(null);
    },
    [],
  );

  return {
    error,
    isReady,
    selectedCurrency: selection.currency,
    setSelectedCurrency,
  };
}
