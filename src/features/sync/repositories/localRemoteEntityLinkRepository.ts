import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

export type RemoteEntityType =
  'space' | 'category' | 'money_account' | 'transaction';

type LinkRow = { local_id: string };
type RemoteLinkRow = { remote_id: string };
type LinkPairRow = { local_id: string; remote_id: string };

export async function findLocalIdForRemoteEntity(input: {
  executor: LocalSqlExecutor;
  userId: string;
  entityType: RemoteEntityType;
  remoteId: string;
}): Promise<string | null> {
  const row = await input.executor.getFirstAsync<LinkRow>(
    `SELECT local_id FROM remote_entity_links
      WHERE user_id = ? AND entity_type = ? AND remote_id = ?`,
    input.userId,
    input.entityType,
    input.remoteId,
  );
  return row?.local_id ?? null;
}

/**
 * Todos los enlaces de un tipo para una cuenta, en una sola lectura. Restaurar
 * un snapshot consulta el enlace de cada fila; leerlos de golpe evita una ida
 * y vuelta a SQLite por movimiento.
 */
export async function loadRemoteEntityLinks(input: {
  executor: LocalSqlExecutor;
  userId: string;
  entityType: RemoteEntityType;
}): Promise<Map<string, string>> {
  const rows = await input.executor.getAllAsync<LinkPairRow>(
    `SELECT remote_id, local_id FROM remote_entity_links
      WHERE user_id = ? AND entity_type = ?`,
    input.userId,
    input.entityType,
  );
  return new Map(rows.map((row) => [row.remote_id, row.local_id]));
}

/** Traduce un ID local a su ID remoto para las rutas que lo usan como parámetro. */
export async function findRemoteIdForLocalEntity(input: {
  executor: LocalSqlExecutor;
  userId: string;
  entityType: RemoteEntityType;
  localId: string;
}): Promise<string | null> {
  const row = await input.executor.getFirstAsync<RemoteLinkRow>(
    `SELECT remote_id FROM remote_entity_links
      WHERE user_id = ? AND entity_type = ? AND local_id = ?`,
    input.userId,
    input.entityType,
    input.localId,
  );
  return row?.remote_id ?? null;
}

/**
 * Escribe el enlace sin releerlo. Un enlace ya existente conserva su id local
 * (solo se refresca `updated_at`), así que quien llama debe pasar el id local
 * vigente si lo conoce, por ejemplo tras `loadRemoteEntityLinks`.
 */
export async function upsertRemoteEntityLink(input: {
  executor: LocalSqlExecutor;
  userId: string;
  entityType: RemoteEntityType;
  remoteId: string;
  localId: string;
}): Promise<void> {
  if (!input.userId || !input.remoteId) {
    throw new Error('El enlace remoto no es válido');
  }
  const now = new Date().toISOString();
  await input.executor.runAsync(
    `INSERT INTO remote_entity_links (
       user_id, entity_type, remote_id, local_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, entity_type, remote_id) DO UPDATE SET
       updated_at = excluded.updated_at`,
    input.userId,
    input.entityType,
    input.remoteId,
    input.localId,
    now,
    now,
  );
}
