import { useCallback, useMemo, useState } from 'react';

import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import {
  buildVisibleCurrencyCatalog,
  getNextHomeCurrency,
  pickVisibleCurrency,
  type VisibleCurrencyCatalog,
} from '@/lib/currency/visibleCurrencyCatalog';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { useCurrencyPreferences } from '@/state/appPreferences/useCurrencyPreferences';
import { useHomeCurrencySelection } from '@/state/appPreferences/useHomeCurrencySelection';

type VisibleCurrencyCatalogInput = {
  /** Monedas presentes en los movimientos del espacio activo. */
  movementCurrencies: readonly string[];
  /** Aviso al usuario si no se puede guardar la selección de moneda. */
  onSaveError: () => void;
  /** Moneda del espacio activo: encabeza el catálogo canónico. */
  spaceCurrency: CurrencyCode;
};

type VisibleCurrencyCatalogController = {
  closeHomeCurrencyPicker: () => void;
  effectiveHomeCurrency: CurrencyCode;
  hasMultipleVisibleCurrencies: boolean;
  isHomeCurrencyPickerVisible: boolean;
  preferences: CurrencyPreferences;
  pressHomeCurrency: () => void;
  selectHomeCurrency: (currency: CurrencyCode) => void;
  setCurrencyPreferences: (next: CurrencyPreferences) => Promise<void>;
  visibleCurrencies: VisibleCurrencyCatalog;
};

/**
 * Derivación monetaria del espacio activo: catálogo canónico de monedas
 * visibles, moneda efectiva de Inicio y control del selector del encabezado.
 * Inicio, Actividad, el selector, la creación y la importación consumen este
 * mismo catálogo. El orden canónico es: la moneda del espacio primero,
 * después las preferencias personales y por último las monedas presentes en
 * los movimientos.
 */
export function useVisibleCurrencyCatalog({
  movementCurrencies,
  onSaveError,
  spaceCurrency,
}: VisibleCurrencyCatalogInput): VisibleCurrencyCatalogController {
  const { activeCurrencies, preferences, setCurrencyPreferences } =
    useCurrencyPreferences();
  const { selectedCurrency, setSelectedCurrency } = useHomeCurrencySelection();
  const [isHomeCurrencyPickerVisible, setHomeCurrencyPickerVisible] =
    useState(false);
  const visibleCurrencies = useMemo(
    () =>
      buildVisibleCurrencyCatalog({
        movementCurrencies,
        preferenceCurrencies: activeCurrencies,
        spaceCurrency,
      }),
    [activeCurrencies, movementCurrencies, spaceCurrency],
  );
  const hasMultipleVisibleCurrencies = visibleCurrencies.length > 1;
  const effectiveHomeCurrency = pickVisibleCurrency(
    visibleCurrencies,
    selectedCurrency,
  );
  const pressHomeCurrency = useCallback(() => {
    const nextCurrency = getNextHomeCurrency(
      visibleCurrencies,
      effectiveHomeCurrency,
    );
    if (nextCurrency) {
      void setSelectedCurrency(nextCurrency).catch(onSaveError);
      return;
    }
    if (visibleCurrencies.length >= 3) {
      setHomeCurrencyPickerVisible(true);
    }
  }, [
    effectiveHomeCurrency,
    onSaveError,
    setSelectedCurrency,
    visibleCurrencies,
  ]);
  const selectHomeCurrency = useCallback(
    (currency: CurrencyCode) => {
      setHomeCurrencyPickerVisible(false);
      void setSelectedCurrency(currency).catch(onSaveError);
    },
    [onSaveError, setSelectedCurrency],
  );
  const closeHomeCurrencyPicker = useCallback(() => {
    setHomeCurrencyPickerVisible(false);
  }, []);

  return {
    closeHomeCurrencyPicker,
    effectiveHomeCurrency,
    hasMultipleVisibleCurrencies,
    isHomeCurrencyPickerVisible,
    preferences,
    pressHomeCurrency,
    selectHomeCurrency,
    setCurrencyPreferences,
    visibleCurrencies,
  };
}
