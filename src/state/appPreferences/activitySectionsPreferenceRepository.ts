import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultActivitySectionsPreference,
  type ActivitySectionsPreference,
} from '@/state/appPreferences/activitySectionsPreference';

const activitySectionsStorageKey = '@juntoss/activity-sections/v1';

type StoredActivitySectionsPreference = ActivitySectionsPreference & {
  version: 1;
};

function parseStoredActivitySectionsPreference(
  value: string,
): ActivitySectionsPreference {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('La preferencia de secciones de Actividad no es válida');
  }

  const candidate = parsed as Partial<StoredActivitySectionsPreference>;
  if (
    candidate.version !== 1 ||
    typeof candidate.accountsExpanded !== 'boolean' ||
    typeof candidate.categoriesExpanded !== 'boolean' ||
    (candidate.categoryView !== undefined &&
      candidate.categoryView !== 'grid' &&
      candidate.categoryView !== 'list')
  ) {
    throw new Error('La preferencia de secciones de Actividad no es válida');
  }

  return {
    accountsExpanded: candidate.accountsExpanded,
    categoriesExpanded: candidate.categoriesExpanded,
    categoryView: candidate.categoryView ?? 'list',
  };
}

export async function loadActivitySectionsPreference(): Promise<ActivitySectionsPreference> {
  const stored = await AsyncStorage.getItem(activitySectionsStorageKey);

  if (stored === null) {
    return defaultActivitySectionsPreference;
  }

  try {
    return parseStoredActivitySectionsPreference(stored);
  } catch {
    return defaultActivitySectionsPreference;
  }
}

export async function saveActivitySectionsPreference(
  preference: ActivitySectionsPreference,
): Promise<void> {
  const stored: StoredActivitySectionsPreference = {
    ...preference,
    version: 1,
  };

  await AsyncStorage.setItem(
    activitySectionsStorageKey,
    JSON.stringify(stored),
  );
}
