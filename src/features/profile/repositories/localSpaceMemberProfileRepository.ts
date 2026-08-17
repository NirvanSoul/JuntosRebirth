import type { SpaceMemberProfile } from '@/features/profile/types';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type SpaceMemberProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
  avatar_cached_uri: string | null;
  default_currency: string | null;
};

function mapProfile(row: SpaceMemberProfileRow): SpaceMemberProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name?.trim() ? row.display_name : null,
    avatarPath: row.avatar_path,
    avatarUpdatedAt: row.avatar_updated_at,
    // El sello viaja en la uri para invalidar la caché de imagen de React
    // Native cuando la otra persona cambia su foto sin cambiar de ruta.
    avatarUri: row.avatar_cached_uri
      ? `${row.avatar_cached_uri}?v=${row.avatar_updated_at ?? ''}`
      : null,
    defaultCurrency:
      row.default_currency && isCurrencyCode(row.default_currency)
        ? row.default_currency
        : null,
  };
}

export async function listSpaceMemberProfiles(
  spaceId: string,
): Promise<SpaceMemberProfile[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<SpaceMemberProfileRow>(
    `SELECT user_id, display_name, avatar_path, avatar_updated_at,
            avatar_cached_uri, default_currency
       FROM space_member_profiles
      WHERE space_id = ?
      ORDER BY user_id ASC`,
    spaceId,
  );
  return rows.map(mapProfile);
}

export async function saveSpaceMemberAvatarCache(
  spaceId: string,
  userId: string,
  cachedUri: string | null,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `UPDATE space_member_profiles
        SET avatar_cached_uri = ?
      WHERE space_id = ? AND user_id = ?`,
    cachedUri,
    spaceId,
    userId,
  );
}

/**
 * Vuelca el censo del espacio tal y como lo devuelve el servidor.
 *
 * Borra y reinserta dentro de una transacción en vez de hacer `upsert` fila a
 * fila: así una persona que sale del espacio desaparece también en local. El
 * volumen es de dos filas por espacio, de modo que no compensa un diff.
 *
 * `avatar_cached_uri` se conserva de la fila anterior en lugar de tomarse del
 * censo entrante: el archivo descargado sigue en disco y volver a ponerlo a
 * null obligaría a redescargarlo en cada sincronización.
 */
export async function replaceSpaceMemberProfiles(
  spaceId: string,
  profiles: readonly SpaceMemberProfile[],
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const cachedRows = await transaction.getAllAsync<{
      user_id: string;
      avatar_cached_uri: string | null;
    }>(
      'SELECT user_id, avatar_cached_uri FROM space_member_profiles WHERE space_id = ?',
      spaceId,
    );
    const cachedByUserId = new Map(
      cachedRows.map((row) => [row.user_id, row.avatar_cached_uri]),
    );

    await transaction.runAsync(
      'DELETE FROM space_member_profiles WHERE space_id = ?',
      spaceId,
    );
    for (const profile of profiles) {
      await transaction.runAsync(
        `INSERT INTO space_member_profiles
           (space_id, user_id, display_name, avatar_path, avatar_updated_at,
            avatar_cached_uri, default_currency, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        spaceId,
        profile.userId,
        profile.displayName,
        profile.avatarPath,
        profile.avatarUpdatedAt,
        cachedByUserId.get(profile.userId) ?? null,
        profile.defaultCurrency,
        now,
      );
    }
  });
}
