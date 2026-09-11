import AsyncStorage from '@react-native-async-storage/async-storage';

export type CountryChangeNotice = { previousCountryName: string };
const keyFor = (userId: string) => `juntoss:space-country-change:${userId}`;

export async function saveCountryChangeNotice(
  userId: string,
  notice: CountryChangeNotice,
): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(notice));
}

export async function loadCountryChangeNotice(
  userId: string,
): Promise<CountryChangeNotice | null> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  return value !== null &&
    typeof value === 'object' &&
    'previousCountryName' in value &&
    typeof value.previousCountryName === 'string'
    ? { previousCountryName: value.previousCountryName }
    : null;
}

export async function clearCountryChangeNotice(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(userId));
}
