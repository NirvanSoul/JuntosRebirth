import type { LocalProfile } from '@/features/profile/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type LocalProfileRow = {
  avatar_path: string | null;
  avatar_updated_at: string | null;
  display_name: string | null;
};

function mapProfile(row: LocalProfileRow | null): LocalProfile {
  return {
    avatarUri: row?.avatar_path
      ? `${row.avatar_path}?v=${row.avatar_updated_at}`
      : null,
    displayName: row?.display_name?.trim() ? row.display_name : null,
  };
}

export async function getLocalProfile(): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<LocalProfileRow>(
    'SELECT avatar_path, avatar_updated_at, display_name FROM local_profile WHERE singleton_id = 1',
  );
  return mapProfile(row ?? null);
}

/**
 * Guarda la foto recién elegida y la deja marcada como pendiente de subir.
 *
 * El estado se escribe en la misma sentencia que el archivo, no después: si la
 * app muere entre ambas, la foto quedaría en el dispositivo sin que nada la
 * reclamara nunca.
 */
export async function saveLocalProfileAvatar(
  avatarPath: string,
): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO local_profile
       (singleton_id, avatar_path, avatar_updated_at, avatar_sync_status)
     VALUES (1, ?, ?, 'pending')
     ON CONFLICT (singleton_id) DO UPDATE SET
       avatar_path = excluded.avatar_path,
       avatar_updated_at = excluded.avatar_updated_at,
       avatar_sync_status = 'pending'`,
    avatarPath,
    now,
  );
  return getLocalProfile();
}

export type LocalAvatarUpload = {
  /** Ruta del archivo en el dispositivo, o `null` si no hay foto. */
  localPath: string | null;
  syncStatus: string;
};

export async function getLocalAvatarUpload(): Promise<LocalAvatarUpload> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{
    avatar_path: string | null;
    avatar_sync_status: string | null;
  }>(
    'SELECT avatar_path, avatar_sync_status FROM local_profile WHERE singleton_id = 1',
  );
  return {
    localPath: row?.avatar_path ?? null,
    syncStatus: row?.avatar_sync_status ?? 'local_only',
  };
}

/**
 * Registra el desenlace de una subida.
 *
 * La condición sobre `avatar_path` evita una carrera real: si mientras subía la
 * foto A la persona eligió la B, marcar 'synced' a ciegas daría por subida una
 * foto que nunca salió del móvil. Al comparar la ruta, ese caso deja la fila
 * como está y la B se sube en el siguiente intento.
 */
export async function markAvatarUploadResult(
  localPath: string,
  syncStatus: 'synced' | 'failed',
  remotePath: string | null,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE local_profile
        SET avatar_sync_status = ?, avatar_remote_path = ?
      WHERE singleton_id = 1 AND avatar_path = ?`,
    syncStatus,
    remotePath,
    localPath,
  );
}

/**
 * Guarda el nombre local capturado durante el onboarding. Vuelve a leer la
 * fila completa en vez de construir el resultado a mano: a diferencia del
 * avatar, aquí no conocemos las demás columnas ya guardadas.
 */
export async function saveLocalProfileDisplayName(
  displayName: string,
): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO local_profile (singleton_id, display_name)
     VALUES (1, ?)
     ON CONFLICT (singleton_id) DO UPDATE SET
       display_name = excluded.display_name`,
    displayName.trim(),
  );
  return getLocalProfile();
}
