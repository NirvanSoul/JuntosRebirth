import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultHomeCurrencySelection,
  type HomeCurrencySelection,
} from '@/state/appPreferences/homeCurrencySelection';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

const homeCurrencySelectionStorageKey = '@juntoss/home-currency-selection/v1';

type StoredHomeCurrencySelection = {
  version: 1;
  currency: string | null;
};

function parseStoredHomeCurrencySelection(
  value: string,
): HomeCurrencySelection {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('La moneda guardada para Inicio no es válida');
  }

  const candidate = parsed as Partial<StoredHomeCurrencySelection>;
  if (
    candidate.version !== 1 ||
    (candidate.currency !== null &&
      !(
        typeof candidate.currency === 'string' &&
        isCurrencyCode(candidate.currency)
      ))
  ) {
    throw new Error('La moneda guardada para Inicio no es válida');
  }

  return { currency: (candidate.currency as CurrencyCode | null) ?? null };
}

export async function loadHomeCurrencySelection(): Promise<HomeCurrencySelection> {
  const stored = await AsyncStorage.getItem(homeCurrencySelectionStorageKey);

  if (stored === null) {
    return defaultHomeCurrencySelection;
  }

  try {
    return parseStoredHomeCurrencySelection(stored);
  } catch {
    return defaultHomeCurrencySelection;
  }
}

export async function saveHomeCurrencySelection(
  selection: HomeCurrencySelection,
): Promise<void> {
  const stored: StoredHomeCurrencySelection = {
    version: 1,
    currency: selection.currency,
  };

  await AsyncStorage.setItem(
    homeCurrencySelectionStorageKey,
    JSON.stringify(stored),
  );
}
