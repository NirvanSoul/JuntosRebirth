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

/**
 * Monedas que la persona eligió de verdad, o `null` si nunca se guardaron.
 * Distinguir ese caso evita tratar el valor por defecto del catálogo (EUR)
 * como una elección: una cuenta de Colombia que todavía no tiene preferencias
 * debe recibir COP por su país, no heredar EUR.
 */
export async function loadStoredCurrencyPreferences(): Promise<CurrencyPreferences | null> {
  const stored = await AsyncStorage.getItem(currencyPreferencesStorageKey);

  if (stored === null) {
    return null;
  }

  try {
    return parseStoredCurrencyPreferences(stored);
  } catch {
    return null;
  }
}

export async function loadCurrencyPreferences(): Promise<CurrencyPreferences> {
  return (await loadStoredCurrencyPreferences()) ?? defaultCurrencyPreferences;
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
