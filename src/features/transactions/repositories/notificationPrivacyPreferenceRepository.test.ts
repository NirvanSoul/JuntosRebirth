import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getShowAmountsInNotifications,
  setShowAmountsInNotifications,
} from '@/features/transactions/repositories/notificationPrivacyPreferenceRepository';

describe('notificationPrivacyPreferenceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('muestra importes por defecto cuando no hay preferencia guardada', async () => {
    await expect(getShowAmountsInNotifications()).resolves.toBe(true);
  });

  it('guarda y recupera la preferencia desactivada', async () => {
    await setShowAmountsInNotifications(false);

    await expect(getShowAmountsInNotifications()).resolves.toBe(false);
  });

  it('permite volver a activarla', async () => {
    await setShowAmountsInNotifications(false);
    await setShowAmountsInNotifications(true);

    await expect(getShowAmountsInNotifications()).resolves.toBe(true);
  });
});
