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
      // Se aplica antes de guardar: esperar a AsyncStorage retrasaba el cambio
      // de moneda y sus gráficas hasta que terminaba la escritura.
      const next: HomeCurrencySelection = { currency };
      let previous: HomeCurrencySelection = defaultHomeCurrencySelection;
      setSelection((current) => {
        previous = current;
        return next;
      });
      setError(null);
      try {
        await saveHomeCurrencySelection(next);
      } catch {
        const message = 'No pudimos guardar la moneda. Inténtalo de nuevo.';
        // Solo revierte si nadie eligió otra moneda mientras se guardaba.
        setSelection((current) => (current === next ? previous : current));
        setError(message);
        throw new Error(message);
      }
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
