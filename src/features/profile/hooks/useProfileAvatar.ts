import { useCallback, useEffect, useRef, useState } from 'react';

import { getLocalProfile } from '@/features/profile/repositories/localProfileRepository';
import {
  getAvatarErrorCopy,
  type AvatarErrorCopy,
} from '@/features/profile/services/avatarErrorCopy';
import {
  removeProfileAvatar,
  updateProfileAvatar,
  type AvatarFlowStage,
} from '@/features/profile/services/updateProfileAvatar';
import type { AvatarPickSource } from '@/features/profile/types';

export type ProfileAvatarState = {
  avatarUri: string | null;
  stage: AvatarFlowStage;
  /** `true` mientras haya una operación en curso: la acción va deshabilitada. */
  isBusy: boolean;
  /** Texto que la pantalla muestra durante el trabajo, o `null`. */
  progressLabel: string | null;
  errorCopy: AvatarErrorCopy | null;
  changeAvatar: (source: AvatarPickSource) => void;
  removeAvatar: () => void;
  dismissError: () => void;
};

const progressLabels: Partial<Record<AvatarFlowStage, string>> = {
  processing: 'Preparando foto…',
  uploading: 'Guardando foto…',
};

/**
 * Estado de la foto de perfil para la interfaz.
 *
 * Concentra aquí las fases y el bloqueo para que la pantalla no tenga que
 * saber en qué punto del circuito está: mientras `isBusy`, la acción de cambiar
 * foto queda deshabilitada, de modo que un doble toque no puede lanzar dos
 * subidas cuya carrera decidiría cuál gana por orden de llegada.
 */
export function useProfileAvatar(): ProfileAvatarState {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [stage, setStage] = useState<AvatarFlowStage>('idle');
  const [errorCopy, setErrorCopy] = useState<AvatarErrorCopy | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    void getLocalProfile().then((profile) => {
      if (isMountedRef.current) setAvatarUri(profile.avatarUri);
    });
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isBusy =
    stage === 'picking' || stage === 'processing' || stage === 'uploading';

  const changeAvatar = useCallback(
    (source: AvatarPickSource) => {
      if (isBusy) return;
      setErrorCopy(null);

      void (async () => {
        try {
          const profile = await updateProfileAvatar(source, (next) => {
            if (isMountedRef.current) setStage(next);
          });
          if (!isMountedRef.current) return;
          // `null` es una cancelación: no hay foto nueva ni error que mostrar.
          if (profile) setAvatarUri(profile.avatarUri);
          setStage('idle');
        } catch (error) {
          if (!isMountedRef.current) return;
          setErrorCopy(getAvatarErrorCopy(error));
          setStage('idle');
        }
      })();
    },
    [isBusy],
  );

  const removeAvatar = useCallback(() => {
    if (isBusy) return;
    setErrorCopy(null);
    setStage('uploading');

    void (async () => {
      try {
        const profile = await removeProfileAvatar();
        if (!isMountedRef.current) return;
        setAvatarUri(profile.avatarUri);
      } catch (error) {
        if (!isMountedRef.current) return;
        setErrorCopy(getAvatarErrorCopy(error));
      } finally {
        if (isMountedRef.current) setStage('idle');
      }
    })();
  }, [isBusy]);

  return {
    avatarUri,
    stage,
    isBusy,
    progressLabel: progressLabels[stage] ?? null,
    errorCopy,
    changeAvatar,
    removeAvatar,
    dismissError: () => setErrorCopy(null),
  };
}
