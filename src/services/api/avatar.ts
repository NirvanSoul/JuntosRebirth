import { avatarContentType } from '@/features/profile/services/avatarImage';
import { apiClient } from '@/services/api/juntossApiClient';

export type RemoteAvatar = {
  /** Clave del objeto en el almacenamiento del servidor, `{userId}/avatar.jpg`. */
  avatarPath: string;
  /** Sello de la última subida. Es la versión con la que se invalida la caché. */
  avatarUpdatedAt: string;
};

type UploadAvatarResponse = {
  data: { avatar: { avatarPath: string; avatarUpdatedAt: string } };
};

/**
 * Ruta del avatar de una persona **en la API**, nunca en el almacenamiento.
 *
 * Punto único donde se construye la dirección de un avatar. El objeto remoto
 * vive tras una clave fija, así que la dirección no cambia al cambiar de foto:
 * `avatarUpdatedAt` viaja como `?v=` para que ninguna caché intermedia sirva
 * la anterior. El endpoint ignora los parámetros que no conoce, de modo que
 * añadirlo es transparente para el servidor.
 *
 * `avatarPath` no se concatena a ningún dominio: es un identificador interno
 * del servidor y el cliente no sabe —ni debe saber— dónde está el bucket.
 */
export function getAvatarUri(
  userId: string,
  avatarUpdatedAt?: string | null,
): string {
  const path = `/v1/avatars/${encodeURIComponent(userId)}`;
  return avatarUpdatedAt
    ? `${path}?v=${encodeURIComponent(avatarUpdatedAt)}`
    : path;
}

/**
 * Sube el JPEG ya comprimido por el dispositivo.
 *
 * El cuerpo son los bytes tal cual, con `Content-Type: image/jpeg`: ni JSON
 * con base64 ni multipart. El servidor comprueba la estructura real del JPEG,
 * así que la cabecera no basta para colar otra cosa.
 */
export async function uploadAvatar(bytes: Uint8Array): Promise<RemoteAvatar> {
  const response = await apiClient.putBytes<UploadAvatarResponse>(
    '/v1/me/avatar',
    bytes,
    avatarContentType,
  );
  return response.data.avatar;
}

/**
 * Descarga el avatar de alguien con quien se comparte un espacio activo.
 *
 * `null` significa «esa persona todavía no tiene foto» (404), que es una
 * respuesta normal y no un fallo que deba alertar a nadie.
 */
export async function getAvatar(
  userId: string,
  avatarUpdatedAt?: string | null,
): Promise<Uint8Array | null> {
  return apiClient.getBytes(getAvatarUri(userId, avatarUpdatedAt));
}

/** Borra el avatar propio. El servidor limpia el objeto y las columnas. */
export async function deleteAvatar(): Promise<void> {
  await apiClient.delete<void>('/v1/me/avatar');
}
