import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultCurrencySymbolPreference,
  type CurrencySymbolPreference,
} from '@/state/appPreferences/currencySymbolPreference';

const currencySymbolPreferenceStorageKey =
  '@juntoss/currency-symbol-preference/v1';

type StoredCurrencySymbolPreference = {
  version: 1;
  showCurrencySymbols: boolean;
};

function getStorageKey(accountId: string): string {
  return `${currencySymbolPreferenceStorageKey}:${accountId}`;
}

function parseStoredPreference(value: string): CurrencySymbolPreference {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('La preferencia de símbolos de moneda no es válida');
  }

  const candidate = parsed as Partial<StoredCurrencySymbolPreference>;
  if (
    candidate.version !== 1 ||
    typeof candidate.showCurrencySymbols !== 'boolean'
  ) {
    throw new Error('La preferencia de símbolos de moneda no es válida');
  }

  return { showCurrencySymbols: candidate.showCurrencySymbols };
}

export async function loadCurrencySymbolPreference(
  accountId: string,
): Promise<CurrencySymbolPreference> {
  const stored = await AsyncStorage.getItem(getStorageKey(accountId));

  if (stored === null) return defaultCurrencySymbolPreference;

  try {
    return parseStoredPreference(stored);
  } catch {
    return defaultCurrencySymbolPreference;
  }
}

export async function saveCurrencySymbolPreference(
  accountId: string,
  preference: CurrencySymbolPreference,
): Promise<void> {
  const stored: StoredCurrencySymbolPreference = {
    version: 1,
    showCurrencySymbols: preference.showCurrencySymbols,
  };

  await AsyncStorage.setItem(getStorageKey(accountId), JSON.stringify(stored));
}
