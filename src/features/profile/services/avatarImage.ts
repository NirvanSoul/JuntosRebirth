/**
 * Reglas puras del avatar: geometría, límites y códigos de error.
 *
 * No importa nada nativo a propósito. Toda la aritmética del recorte y de la
 * escalera de calidad se puede probar sin simulador, y el servicio que sí toca
 * `expo-image-manipulator` se limita a ejecutar lo que aquí se decide.
 *
 * Los límites son los que valida el Worker (`services/avatars.ts`): duplicarlos
 * aquí no es redundancia, es fallar en el dispositivo con un mensaje que la
 * persona entiende en vez de gastar la subida para recibir un 400.
 */

/** Lado del avatar que se sube. El backend acepta hasta 1024. */
export const avatarTargetDimension = 512;

/** Lado mínimo que acepta el backend; por debajo devuelve `AVATAR_TOO_SMALL`. */
export const avatarMinSourceDimension = 64;

/** Lado máximo que acepta el backend; por encima devuelve `AVATAR_TOO_LARGE`. */
export const avatarMaxDimension = 1024;

/** Tope duro del backend: 256 KiB. */
export const avatarMaxBytes = 256 * 1024;

/**
 * Objetivo del compresor, por debajo del tope duro.
 *
 * El margen cubre la única diferencia que el cliente no controla: el fichero
 * que mide `File.size` es exactamente el que se sube, pero un reintento tras
 * un `AVATAR_TOO_LARGE` del servidor debe poder bajar de verdad, no quedarse
 * rozando el límite.
 */
export const avatarTargetMaxBytes = 220 * 1024;

/**
 * Escalera de calidad. Empieza en el 0.8 que documenta el backend (40–60 KiB
 * a 512×512) y baja en pasos de 0.1 hasta un suelo por debajo del cual el
 * JPEG se ve peor que la foto que la persona eligió.
 */
export const avatarQualitySteps = [0.8, 0.7, 0.6, 0.5, 0.4] as const;

export const avatarContentType = 'image/jpeg';

/** Códigos de la API que la interfaz distingue, más los que decide el cliente. */
export type AvatarErrorCode =
  | 'AVATAR_INVALID_FORMAT'
  | 'AVATAR_PERMISSION_DENIED'
  | 'AVATAR_TOO_LARGE'
  | 'AVATAR_TOO_SMALL';

/**
 * Error del circuito de avatar con un código sobre el que ramificar.
 *
 * Comparte vocabulario con `ApiError.code` para que la pantalla tenga un solo
 * mapa de textos: da igual si el rechazo lo decidió el móvil antes de subir o
 * el Worker después.
 */
export class AvatarError extends Error {
  readonly code: AvatarErrorCode;

  constructor(code: AvatarErrorCode, message: string) {
    super(message);
    this.name = 'AvatarError';
    this.code = code;
  }
}

export type AvatarCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Recorte central cuadrado.
 *
 * Recortar y luego escalar es lo que evita la deformación: llevar 1200×800
 * directamente a 512×512 estira la cara, mientras que recortar 800×800 del
 * centro y reducirlo conserva las proporciones. Una imagen ya cuadrada produce
 * un rectángulo que cubre la foto entera, de modo que la operación es un
 * no-op y no hay dos caminos distintos que mantener.
 */
export function resolveAvatarCrop(width: number, height: number): AvatarCrop {
  const side = Math.min(width, height);
  return {
    originX: Math.round((width - side) / 2),
    originY: Math.round((height - side) / 2),
    width: side,
    height: side,
  };
}

/**
 * Lado del JPEG que se sube.
 *
 * Nunca agranda: una foto cuyo recorte mide menos de 512 se sube a su tamaño
 * real. Agrandarla no añadiría un solo píxel de detalle y sí bytes, y además
 * disfrazaría ante el servidor una imagen que la persona debería cambiar.
 */
export function resolveAvatarOutputDimension(cropSide: number): number {
  return Math.min(avatarTargetDimension, cropSide);
}

/**
 * Rechaza en el dispositivo lo que el backend rechazaría después.
 *
 * Se comprueba sobre la imagen **de origen**, antes de tocarla: escalar un
 * 32×32 a 512×512 pasaría la validación del servidor y dejaría un avatar
 * ilegible, así que la resolución insuficiente es una respuesta, no un
 * problema que el compresor deba disimular.
 */
export function validateAvatarSource(width: number, height: number): void {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new AvatarError(
      'AVATAR_INVALID_FORMAT',
      'La imagen elegida no tiene dimensiones legibles',
    );
  }

  if (Math.min(width, height) < avatarMinSourceDimension) {
    throw new AvatarError(
      'AVATAR_TOO_SMALL',
      'La imagen elegida no llega al mínimo de resolución',
    );
  }
}

/**
 * Calidades que quedan por probar a partir de una ya usada.
 *
 * Sirve tanto al primer pase como al reintento después de un
 * `AVATAR_TOO_LARGE` del servidor: en ambos casos la lista es finita y
 * decreciente, así que el bucle no puede quedarse dando vueltas.
 */
export function avatarQualitiesBelow(quality: number): readonly number[] {
  return avatarQualitySteps.filter((step) => step < quality);
}

/**
 * Nombre del archivo cacheado, con el sello de la subida incrustado.
 *
 * La clave de caché es `userId` + `avatarUpdatedAt` porque la ruta remota es
 * fija (`{userId}/avatar.jpg`): sin el sello, cambiar de foto dejaría la
 * anterior en pantalla indefinidamente. Con él, un sello nuevo no encuentra
 * archivo y fuerza la descarga.
 */
export function buildAvatarCacheFileName(
  userId: string,
  avatarUpdatedAt: string,
): string {
  return `${userId}__${avatarUpdatedAt.replace(/\D/g, '')}.jpg`;
}
