import type { SupabaseClient } from '@supabase/supabase-js';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

const avatarBucket = 'avatars';

/** Ruta canónica del avatar de una persona dentro del bucket. */
export function buildAvatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/**
 * Sube la miniatura propia.
 *
 * `upsert` en una ruta fija hace la operación idempotente: reintentar tras un
 * corte de red no acumula objetos huérfanos ni exige borrar el anterior, y dos
 * subidas seguidas dejan el bucket en el mismo estado que una.
 */
export async function uploadOwnAvatar(
  userId: string,
  bytes: Uint8Array,
  client: SupabaseClient = getConfiguredSupabaseClient(),
): Promise<string> {
  const path = buildAvatarPath(userId);
  const { error } = await client.storage
    .from(avatarBucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

  if (error) {
    throw new Error('No pudimos subir tu foto de perfil');
  }
  return path;
}

/**
 * Descarga la miniatura de otra persona del espacio.
 *
 * Devuelve `null` cuando el objeto no existe, que no es un error: significa que
 * esa persona todavía no ha puesto foto. Distinguirlo de un fallo real evita
 * que la interfaz muestre una alerta por algo perfectamente normal.
 */
export async function downloadMemberAvatar(
  path: string,
  client: SupabaseClient = getConfiguredSupabaseClient(),
): Promise<Uint8Array | null> {
  const { data, error } = await client.storage
    .from(avatarBucket)
    .download(path);

  if (error || !data) return null;

  const buffer = await data.arrayBuffer();
  // Un cuerpo vacío significa objeto truncado o respuesta a medias: se trata
  // como ausencia en vez de escribir un archivo corrupto en el dispositivo.
  if (buffer.byteLength === 0) return null;
  return new Uint8Array(buffer);
}
