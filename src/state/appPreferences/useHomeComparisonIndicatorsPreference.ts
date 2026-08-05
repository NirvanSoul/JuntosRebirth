import { useCallback, useEffect, useState } from 'react';

import {
  defaultHomeComparisonIndicatorsPreference,
  type HomeComparisonIndicatorsPreference,
} from '@/state/appPreferences/homeComparisonIndicatorsPreference';
import {
  loadHomeComparisonIndicatorsPreference,
  saveHomeComparisonIndicatorsPreference,
} from '@/state/appPreferences/homeComparisonIndicatorsPreferenceRepository';

type HomeComparisonIndicatorsController = {
  enabled: boolean;
  error: string | null;
  isReady: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
};

export function useHomeComparisonIndicatorsPreference(): HomeComparisonIndicatorsController {
  const [preference, setPreference] =
    useState<HomeComparisonIndicatorsPreference>(
      defaultHomeComparisonIndicatorsPreference,
    );
  const [isReady, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadHomeComparisonIndicatorsPreference()
      .then((stored) => {
        if (isMounted) setPreference(stored);
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    const next: HomeComparisonIndicatorsPreference = { enabled };
    try {
      await saveHomeComparisonIndicatorsPreference(next);
    } catch {
      const message = 'No pudimos guardar el ajuste. Inténtalo de nuevo.';
      setError(message);
      throw new Error(message);
    }
    setPreference(next);
    setError(null);
  }, []);

  return {
    enabled: preference.enabled,
    error,
    isReady,
    setEnabled,
  };
}
