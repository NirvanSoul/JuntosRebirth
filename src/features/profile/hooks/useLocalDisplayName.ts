import { useCallback, useEffect, useState } from 'react';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { useAppForeground } from '@/hooks/useAppForeground';

/**
 * Nombre guardado en el perfil local, releído al volver a primer plano por si
 * se editó en Ajustes o en otro dispositivo.
 */
export function useLocalDisplayName(): string | null {
  const [displayName, setDisplayName] = useState<string | null>(null);

  const load = useCallback(() => {
    void getLocalProfile().then((profile) => {
      setDisplayName(profile.displayName);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useAppForeground(load);

  return displayName;
}
