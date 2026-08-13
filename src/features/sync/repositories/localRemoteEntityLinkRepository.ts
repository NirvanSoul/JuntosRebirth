import { randomUUID } from 'expo-crypto';

import { getLocalDatabase } from '@/lib/storage/localDatabase';

export type RemoteEntityType = 'space' | 'category' | 'transaction';

type LinkRow = { local_id: string };

export async function findLocalIdForRemoteEntity(input: {
  userId: string;
  entityType: RemoteEntityType;
  remoteId: string;
}): Promise<string | null> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<LinkRow>(
    `SELECT local_id FROM remote_entity_links
      WHERE user_id = ? AND entity_type = ? AND remote_id = ?`,
    input.userId,
    input.entityType,
    input.remoteId,
  );
  return row?.local_id ?? null;
}

/** El vínculo es la única autoridad para traducir un ID remoto a uno local. */
export async function linkRemoteEntity(input: {
  userId: string;
  entityType: RemoteEntityType;
  remoteId: string;
  localId?: string;
}): Promise<string> {
  if (!input.userId || !input.remoteId) {
    throw new Error('El enlace remoto no es válido');
  }
  const database = await getLocalDatabase();
  const localId = input.localId ?? randomUUID();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO remote_entity_links (
       user_id, entity_type, remote_id, local_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, entity_type, remote_id) DO UPDATE SET
       updated_at = excluded.updated_at`,
    input.userId,
    input.entityType,
    input.remoteId,
    localId,
    now,
    now,
  );
  return (
    (await findLocalIdForRemoteEntity({
      userId: input.userId,
      entityType: input.entityType,
      remoteId: input.remoteId,
    })) ?? localId
  );
}
