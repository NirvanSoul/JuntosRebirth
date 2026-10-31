import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAnalyticsEnabled,
  setAnalyticsEnabled,
} from './analyticsPreferenceRepository';

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('activa la analítica por defecto cuando no hay una decisión guardada', async () => {
  expect(await getAnalyticsEnabled()).toBe(true);
});

it('conserva la desactivación y permite volver a activarla', async () => {
  await setAnalyticsEnabled(false);
  expect(await getAnalyticsEnabled()).toBe(false);
  await setAnalyticsEnabled(true);
  expect(await getAnalyticsEnabled()).toBe(true);
});
