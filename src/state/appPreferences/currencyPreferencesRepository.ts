import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultCurrencyPreferences,
  normalizeCurrencyPreferences,
  type CurrencyPreferences,
} from '@/state/appPreferences/currencyPreferences';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

const currencyPreferencesStorageKey = '@juntoss/currency-preferences/v1';

type StoredCurrencyPreferences = {
  version: 1;
  currencies: string[];
};

function parseStoredCurrencyPreferences(value: string): CurrencyPreferences {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Las preferencias de moneda guardadas no son válidas');
  }

  const candidate = parsed as Partial<StoredCurrencyPreferences>;
  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.currencies) ||
    candidate.currencies.length === 0 ||
    !candidate.currencies.every(
      (code): code is CurrencyCode =>
        typeof code === 'string' && isCurrencyCode(code),
    )
  ) {
    throw new Error('Las preferencias de moneda guardadas no son válidas');
  }

  return normalizeCurrencyPreferences({ currencies: candidate.currencies });
}

export async function loadCurrencyPreferences(): Promise<CurrencyPreferences> {
  const stored = await AsyncStorage.getItem(currencyPreferencesStorageKey);

  if (stored === null) {
    return defaultCurrencyPreferences;
  }

  try {
    return parseStoredCurrencyPreferences(stored);
  } catch {
    return defaultCurrencyPreferences;
  }
}

export async function saveCurrencyPreferences(
  preferences: CurrencyPreferences,
): Promise<void> {
  const normalized = normalizeCurrencyPreferences(preferences);
  const stored: StoredCurrencyPreferences = {
    version: 1,
    currencies: [...normalized.currencies],
  };

  await AsyncStorage.setItem(
    currencyPreferencesStorageKey,
    JSON.stringify(stored),
  );
}
