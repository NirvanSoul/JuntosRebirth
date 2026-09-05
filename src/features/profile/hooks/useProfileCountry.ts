import { useCallback, useEffect, useRef, useState } from 'react';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import { updateProfileCountry } from '@/features/profile/services/updateProfileCountry';
import { ApiError } from '@/services/api/client';

export type ProfileCountryState = {
  countryCode: string | null;
  isSaving: boolean;
  error: string | null;
  errorCode: 'country_change_blocked_by_shared_space' | null;
  saveCountry: (countryCode: string) => Promise<CountrySaveResult>;
  dismissError: () => void;
};

export type CountrySaveResult =
  | { success: true }
  | {
      success: false;
      errorCode: ProfileCountryState['errorCode'];
    };

/**
 * Estado del país de perfil para la interfaz de Ajustes.
 *
 * Sigue el mismo patrón que `useProfileDisplayName`: carga lo guardado en
 * local al montar y expone una sola acción de guardado con su propio estado
 * de carga y error. Es autocontenido a propósito — cualquier pantalla que en
 * el futuro necesite ramificar comportamiento por país (por ejemplo,
 * `countryCode === 'VE'`) puede montarlo directamente sin depender de props
 * ni de dónde vive `SettingsScreen` en la navegación.
 */
export function useProfileCountry(): ProfileCountryState {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] =
    useState<ProfileCountryState['errorCode']>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    void getLocalProfile().then((profile) => {
      if (isMountedRef.current) setCountryCode(profile.countryCode);
    });
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const saveCountry = useCallback(
    async (nextCountryCode: string): Promise<CountrySaveResult> => {
      setSaving(true);
      setError(null);
      setErrorCode(null);
      try {
        const profile = await updateProfileCountry(nextCountryCode);
        if (isMountedRef.current) setCountryCode(profile.countryCode);
        return { success: true };
      } catch (caught) {
        console.error('[profiles] no se pudo guardar el país', caught);
        const nextErrorCode =
          caught instanceof ApiError &&
          caught.code === 'COUNTRY_CHANGE_BLOCKED_BY_SHARED_SPACE'
            ? 'country_change_blocked_by_shared_space'
            : null;
        if (isMountedRef.current) {
          setErrorCode(nextErrorCode);
          setError('No pudimos guardar tu país. Inténtalo de nuevo.');
        }
        return { success: false, errorCode: nextErrorCode };
      } finally {
        if (isMountedRef.current) setSaving(false);
      }
    },
    [],
  );

  return {
    countryCode,
    errorCode,
    isSaving,
    error,
    saveCountry,
    dismissError: () => {
      setError(null);
      setErrorCode(null);
    },
  };
}
