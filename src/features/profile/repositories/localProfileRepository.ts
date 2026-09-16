import type { LocalProfile } from '@/features/profile/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

const countrySubscribers = new Set<(countryCode: string) => void>();
const profileSubscribers = new Set<(profile: LocalProfile) => void>();

/**
 * Mantiene sincronizadas las superficies que presentan el perfil propio.
 * SQLite sigue siendo la fuente de verdad; el evento solo evita que cada hook
 * tenga que esperar a un remonte o a que la app vuelva a primer plano.
 */
export function subscribeToLocalProfile(
  subscriber: (profile: LocalProfile) => void,
): () => void {
  profileSubscribers.add(subscriber);
  return () => profileSubscribers.delete(subscriber);
}

/** Notifica a la interfaz cuando la caché de país se actualiza tras restaurar sesión. */
export function subscribeToLocalProfileCountry(
  subscriber: (countryCode: string) => void,
): () => void {
  countrySubscribers.add(subscriber);
  return () => countrySubscribers.delete(subscriber);
}

type LocalProfileRow = {
  avatar_path: string | null;
  avatar_updated_at: string | null;
  avatar_remote_path: string | null;
  avatar_remote_updated_at: string | null;
  display_name: string | null;
  country_code: string | null;
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
    countryCode: row?.country_code?.trim() ? row.country_code : null,
  };
}

export async function getLocalProfile(): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<LocalProfileRow>(
    `SELECT avatar_path, avatar_updated_at, avatar_remote_path,
            avatar_remote_updated_at, display_name, country_code
       FROM local_profile WHERE singleton_id = 1`,
  );
  return mapProfile(row ?? null);
}

async function publishLocalProfile(): Promise<LocalProfile> {
  const profile = await getLocalProfile();
  profileSubscribers.forEach((subscriber) => subscriber(profile));
  return profile;
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
  return publishLocalProfile();
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
  await publishLocalProfile();
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
  return publishLocalProfile();
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
  return publishLocalProfile();
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
    `INSERT INTO local_profile
       (singleton_id, display_name, display_name_sync_status)
     VALUES (1, ?, 'pending')
     ON CONFLICT (singleton_id) DO UPDATE SET
       display_name = excluded.display_name,
       display_name_sync_status = 'pending'`,
    displayName.trim(),
  );
  return publishLocalProfile();
}

/** Nombre pendiente de publicar, si la última edición todavía no llegó a la API. */
export async function getPendingLocalDisplayName(): Promise<string | null> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{
    display_name: string | null;
    display_name_sync_status: string | null;
  }>(
    `SELECT display_name, display_name_sync_status
       FROM local_profile WHERE singleton_id = 1`,
  );
  if (
    !row?.display_name?.trim() ||
    (row.display_name_sync_status !== 'pending' &&
      row.display_name_sync_status !== 'failed')
  ) {
    return null;
  }
  return row.display_name.trim();
}

/** Confirma o conserva como fallida únicamente la edición que se intentó subir. */
export async function markDisplayNameSyncResult(
  displayName: string,
  status: 'synced' | 'failed',
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE local_profile
        SET display_name_sync_status = ?
      WHERE singleton_id = 1 AND display_name = ?`,
    status,
    displayName.trim(),
  );
}

/**
 * Aplica el nombre remoto sin pisar una edición local aún pendiente.
 * La condición vive en SQLite para que una edición concurrente no pueda
 * colarse entre una lectura y esta escritura.
 */
export async function restoreRemoteProfileDisplayName(
  displayName: string | null,
): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO local_profile
       (singleton_id, display_name, display_name_sync_status)
     VALUES (1, ?, 'synced')
     ON CONFLICT (singleton_id) DO UPDATE SET
       display_name = excluded.display_name,
       display_name_sync_status = 'synced'
     WHERE local_profile.display_name_sync_status IS NULL
        OR local_profile.display_name_sync_status NOT IN ('pending', 'failed')`,
    displayName?.trim() || null,
  );
  return publishLocalProfile();
}

/** Refleja que el servidor ya no tiene avatar sin crear una subida pendiente. */
export async function restoreRemoteProfileWithoutAvatar(): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE local_profile
        SET avatar_path = NULL,
            avatar_updated_at = NULL,
            avatar_sync_status = 'synced',
            avatar_remote_path = NULL,
            avatar_remote_updated_at = NULL
      WHERE singleton_id = 1
        AND avatar_sync_status NOT IN ('pending', 'failed')`,
  );
  return publishLocalProfile();
}

/**
 * Guarda el país elegido en el onboarding o en Ajustes. Igual que el nombre,
 * vuelve a leer la fila completa en vez de construir el resultado a mano.
 */
export async function saveLocalProfileCountry(
  countryCode: string,
): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO local_profile (singleton_id, country_code)
     VALUES (1, ?)
     ON CONFLICT (singleton_id) DO UPDATE SET
       country_code = excluded.country_code`,
    countryCode.trim().toUpperCase(),
  );
  const profile = await publishLocalProfile();
  if (profile.countryCode) {
    countrySubscribers.forEach((subscriber) =>
      subscriber(profile.countryCode!),
    );
  }
  return profile;
}
