import AsyncStorage from '@react-native-async-storage/async-storage';

const seenNoticesStorageKey = '@juntoss/seen-upcoming-notices/v1';

type StoredSeenNotices = {
  version: 1;
  keys: string[];
};

/** Claves de los avisos que la persona ya vio en la bandeja de notificaciones. */
export async function loadSeenNoticeKeys(): Promise<ReadonlySet<string>> {
  const stored = await AsyncStorage.getItem(seenNoticesStorageKey);
  if (stored === null) return new Set();

  try {
    const parsed = JSON.parse(stored) as Partial<StoredSeenNotices>;
    if (parsed.version !== 1 || !Array.isArray(parsed.keys)) return new Set();
    return new Set(parsed.keys.filter((key) => typeof key === 'string'));
  } catch {
    return new Set();
  }
}

export async function saveSeenNoticeKeys(
  keys: readonly string[],
): Promise<void> {
  const stored: StoredSeenNotices = { version: 1, keys: [...keys] };
  await AsyncStorage.setItem(seenNoticesStorageKey, JSON.stringify(stored));
}
