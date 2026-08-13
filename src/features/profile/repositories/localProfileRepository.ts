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

export async function saveLocalProfileAvatar(
  avatarPath: string,
): Promise<LocalProfile> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO local_profile (singleton_id, avatar_path, avatar_updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT (singleton_id) DO UPDATE SET
       avatar_path = excluded.avatar_path,
       avatar_updated_at = excluded.avatar_updated_at`,
    avatarPath,
    now,
  );
  return getLocalProfile();
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
