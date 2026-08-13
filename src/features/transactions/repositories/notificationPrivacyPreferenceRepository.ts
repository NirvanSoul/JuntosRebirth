import AsyncStorage from '@react-native-async-storage/async-storage';

const showAmountsStorageKey = '@juntoss/notification-privacy/show-amounts/v1';

/**
 * Por defecto se muestran importes en notificaciones (comportamiento actual);
 * el usuario puede desactivarlo desde Privacidad y datos → Preferencias.
 */
export async function getShowAmountsInNotifications(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(showAmountsStorageKey);
  if (stored === null) return true;
  return stored === 'true';
}

export async function setShowAmountsInNotifications(
  showAmounts: boolean,
): Promise<void> {
  await AsyncStorage.setItem(showAmountsStorageKey, String(showAmounts));
}
