import { useCallback, useEffect, useState } from 'react';

import {
  defaultActivitySectionsPreference,
  type ActivitySectionsPreference,
} from '@/state/appPreferences/activitySectionsPreference';
import {
  loadActivitySectionsPreference,
  saveActivitySectionsPreference,
} from '@/state/appPreferences/activitySectionsPreferenceRepository';

type ActivitySectionsPreferenceController = {
  error: string | null;
  isReady: boolean;
  preference: ActivitySectionsPreference;
  setPreference: (preference: ActivitySectionsPreference) => Promise<void>;
};

export function useActivitySectionsPreference(): ActivitySectionsPreferenceController {
  const [preference, setPreferenceState] = useState<ActivitySectionsPreference>(
    defaultActivitySectionsPreference,
  );
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadActivitySectionsPreference()
      .then((stored) => {
        if (isMounted) setPreferenceState(stored);
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(
    async (next: ActivitySectionsPreference): Promise<void> => {
      try {
        await saveActivitySectionsPreference(next);
      } catch {
        const message =
          'No pudimos guardar la vista de Actividad. Inténtalo de nuevo.';
        setError(message);
        throw new Error(message);
      }
      setPreferenceState(next);
      setError(null);
    },
    [],
  );

  return { error, isReady, preference, setPreference };
}
