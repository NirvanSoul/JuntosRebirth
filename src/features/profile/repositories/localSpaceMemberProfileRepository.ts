import type { SpaceMemberProfile } from '@/features/profile/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type SpaceMemberProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function mapProfile(row: SpaceMemberProfileRow): SpaceMemberProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name?.trim() ? row.display_name : null,
    avatarUrl: row.avatar_url,
  };
}

export async function listSpaceMemberProfiles(
  spaceId: string,
): Promise<SpaceMemberProfile[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<SpaceMemberProfileRow>(
    `SELECT user_id, display_name, avatar_url
       FROM space_member_profiles
      WHERE space_id = ?
      ORDER BY user_id ASC`,
    spaceId,
  );
  return rows.map(mapProfile);
}

/**
 * Vuelca el censo del espacio tal y como lo devuelve el servidor.
 *
 * Borra y reinserta dentro de una transacción en vez de hacer `upsert` fila a
 * fila: así una persona que sale del espacio desaparece también en local. El
 * volumen es de dos filas por espacio, de modo que no compensa un diff.
 */
export async function replaceSpaceMemberProfiles(
  spaceId: string,
  profiles: readonly SpaceMemberProfile[],
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'DELETE FROM space_member_profiles WHERE space_id = ?',
      spaceId,
    );
    for (const profile of profiles) {
      await transaction.runAsync(
        `INSERT INTO space_member_profiles
           (space_id, user_id, display_name, avatar_url, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        spaceId,
        profile.userId,
        profile.displayName,
        profile.avatarUrl,
        now,
      );
    }
  });
}
