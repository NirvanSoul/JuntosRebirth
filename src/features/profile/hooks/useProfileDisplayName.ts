import { useCallback, useEffect, useRef, useState } from 'react';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { updateProfileDisplayName } from '@/features/profile/services/updateProfileDisplayName';

export type ProfileDisplayNameState = {
  displayName: string | null;
  isSaving: boolean;
  error: string | null;
  saveDisplayName: (name: string) => Promise<boolean>;
  dismissError: () => void;
};

/**
 * Estado del nombre de perfil para la interfaz de Ajustes.
 *
 * Sigue el mismo patrón que `useProfileAvatar`: carga lo guardado en local al
 * montar y expone una sola acción de guardado con su propio estado de carga y
 * error, para que la pantalla no tenga que conocer el circuito por debajo.
 */
export function useProfileDisplayName(): ProfileDisplayNameState {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    void getLocalProfile().then((profile) => {
      if (isMountedRef.current) setDisplayName(profile.displayName);
    });
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const saveDisplayName = useCallback(
    async (name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Escribe un nombre.');
        return false;
      }

      setSaving(true);
      setError(null);
      try {
        const profile = await updateProfileDisplayName(trimmed);
        if (isMountedRef.current) setDisplayName(profile.displayName);
        return true;
      } catch (caught) {
        console.error('[profiles] no se pudo guardar el nombre', caught);
        if (isMountedRef.current) {
          setError('No pudimos guardar tu nombre. Inténtalo de nuevo.');
        }
        return false;
      } finally {
        if (isMountedRef.current) setSaving(false);
      }
    },
    [],
  );

  return {
    displayName,
    isSaving,
    error,
    saveDisplayName,
    dismissError: () => setError(null),
  };
}
