import { ApiError } from '@/services/api/client';
import { AvatarError } from '@/features/profile/services/avatarImage';

export type AvatarErrorCopy = { title: string; message: string };

/**
 * Texto para cada código de rechazo.
 *
 * La rama se decide **solo** por el código. El mensaje que acompaña a un error
 * de la API es prosa del servidor: puede cambiar de redacción o de idioma sin
 * previo aviso, así que buscar en él subcadenas como «too large» sería una
 * dependencia sobre algo que nadie se ha comprometido a mantener.
 */
const copyByCode: Record<string, AvatarErrorCopy> = {
  AVATAR_TOO_LARGE: {
    title: 'La imagen es demasiado grande',
    message: 'Estamos intentando optimizarla.',
  },
  AVATAR_TOO_SMALL: {
    title: 'Esta imagen tiene una resolución demasiado baja',
    message: 'Elige otra foto.',
  },
  AVATAR_INVALID_FORMAT: {
    title: 'No pudimos procesar esta imagen',
    message: 'Elige otra foto.',
  },
  AVATAR_PERMISSION_DENIED: {
    title: 'No pudimos acceder a tus fotos',
    message:
      'Revisa los permisos de cámara o galería en los ajustes del sistema.',
  },
};

const fallbackCopy: AvatarErrorCopy = {
  title: 'No se pudo actualizar tu foto',
  message: 'Inténtalo de nuevo en unos minutos.',
};

/** Código de un error del circuito, venga del móvil o de la API. */
export function getAvatarErrorCode(error: unknown): string | null {
  if (error instanceof AvatarError) return error.code;
  if (error instanceof ApiError) return error.code;
  return null;
}

export function getAvatarErrorCopy(error: unknown): AvatarErrorCopy {
  const code = getAvatarErrorCode(error);
  return (code ? copyByCode[code] : undefined) ?? fallbackCopy;
}
