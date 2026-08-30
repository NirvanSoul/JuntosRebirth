import type { LocalProfile } from '@/features/profile/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type LocalProfileRow = {
  avatar_path: string | null;
  avatar_updated_at: string | null;
  avatar_remote_path: string | null;
  avatar_remote_updated_at: string | null;
  display_name: string | null;
};

function mapProfile(row: LocalProfileRow | null): LocalProfile {
  return {
    // El sello viaja en la uri para que React Native no reutilice la imagen
    // anterior: el archivo local siempre se llama igual.
    avatarUri: row?.avatar_path
      ? `${row.avatar_path}?v=${row.avatar_remote_updated_at ?? row.avatar_updated_at}`
      : null,
    avatarPath: row?.avatar_remote_path ?? null,
    avatarUpdatedAt: row?.avatar_remote_updated_at ?? null,
    displayName: row?.display_name?.trim() ? row.display_name : null,
  };
}

export async function getLocalProfile(): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<LocalProfileRow>(
    `SELECT avatar_path, avatar_updated_at, avatar_remote_path,
            avatar_remote_updated_at, display_name
       FROM local_profile WHERE singleton_id = 1`,
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
  /** Último `avatarUpdatedAt` confirmado por la API, o `null`. */
  remoteUpdatedAt: string | null;
};

export async function getLocalAvatarUpload(): Promise<LocalAvatarUpload> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{
    avatar_path: string | null;
    avatar_sync_status: string | null;
    avatar_remote_updated_at: string | null;
  }>(
    `SELECT avatar_path, avatar_sync_status, avatar_remote_updated_at
       FROM local_profile WHERE singleton_id = 1`,
  );
  return {
    localPath: row?.avatar_path ?? null,
    syncStatus: row?.avatar_sync_status ?? 'local_only',
    remoteUpdatedAt: row?.avatar_remote_updated_at ?? null,
  };
}

/**
 * Guarda la metadata que devuelve la API tras subir la foto.
 *
 * `avatarPath` y `avatarUpdatedAt` se guardan juntos y en la misma sentencia
 * que el estado: son la única prueba de que el objeto remoto corresponde al
 * archivo que hay en el dispositivo. La condición sobre `avatar_path` es la
 * misma carrera que cubre `markAvatarUploadResult`.
 */
export async function saveOwnRemoteAvatar(
  localPath: string,
  remote: { avatarPath: string | null; avatarUpdatedAt: string | null },
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE local_profile
        SET avatar_sync_status = 'synced',
            avatar_remote_path = ?,
            avatar_remote_updated_at = ?
      WHERE singleton_id = 1 AND avatar_path = ?`,
    remote.avatarPath,
    remote.avatarUpdatedAt,
    localPath,
  );
}

/**
 * Reemplaza la foto propia con la que acaba de bajarse del servidor.
 *
 * Se usa al estrenar dispositivo: no hay nada pendiente de subir, así que la
 * fila queda directamente como sincronizada con el sello remoto.
 */
export async function saveDownloadedOwnAvatar(input: {
  localPath: string;
  avatarPath: string;
  avatarUpdatedAt: string;
}): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO local_profile
       (singleton_id, avatar_path, avatar_updated_at, avatar_sync_status,
        avatar_remote_path, avatar_remote_updated_at)
     VALUES (1, ?, ?, 'synced', ?, ?)
     ON CONFLICT (singleton_id) DO UPDATE SET
       avatar_path = excluded.avatar_path,
       avatar_updated_at = excluded.avatar_updated_at,
       avatar_sync_status = 'synced',
       avatar_remote_path = excluded.avatar_remote_path,
       avatar_remote_updated_at = excluded.avatar_remote_updated_at`,
    input.localPath,
    input.avatarUpdatedAt,
    input.avatarPath,
    input.avatarUpdatedAt,
  );
  return getLocalProfile();
}

/**
 * Deja el perfil sin foto tras un borrado confirmado por el servidor.
 *
 * Solo se llama después de un 204: borrar antes dejaría a la persona sin foto
 * en el móvil y con ella puesta para su pareja.
 */
export async function clearLocalProfileAvatar(): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE local_profile
        SET avatar_path = NULL,
            avatar_updated_at = ?,
            avatar_sync_status = 'local_only',
            avatar_remote_path = NULL,
            avatar_remote_updated_at = NULL
      WHERE singleton_id = 1`,
    new Date().toISOString(),
  );
  return getLocalProfile();
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
