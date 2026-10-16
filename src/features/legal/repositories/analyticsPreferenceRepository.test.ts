import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAnalyticsEnabled,
  setAnalyticsEnabled,
} from '@/features/legal/repositories/analyticsPreferenceRepository';

describe('analyticsPreferenceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mantiene la analítica desactivada hasta recibir consentimiento', async () => {
    await expect(getAnalyticsEnabled()).resolves.toBe(false);
  });

  it('conserva la revocación y permite volver a activarla', async () => {
    await setAnalyticsEnabled(false);
    await expect(getAnalyticsEnabled()).resolves.toBe(false);

    await setAnalyticsEnabled(true);
    await expect(getAnalyticsEnabled()).resolves.toBe(true);
  });
});
