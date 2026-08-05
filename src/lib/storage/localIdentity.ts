import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

const installationIdKey = 'installation_id';

type MetadataRow = { value: string };

export async function getOrCreateInstallationId(
  database: SQLiteDatabase,
): Promise<string> {
  const stored = await database.getFirstAsync<MetadataRow>(
    'SELECT value FROM local_metadata WHERE key = ?',
    installationIdKey,
  );
  if (stored?.value) return stored.value;

  const candidate = randomUUID();
  await database.runAsync(
    'INSERT OR IGNORE INTO local_metadata (key, value) VALUES (?, ?)',
    installationIdKey,
    candidate,
  );

  const created = await database.getFirstAsync<MetadataRow>(
    'SELECT value FROM local_metadata WHERE key = ?',
    installationIdKey,
  );
  if (!created?.value) {
    throw new Error('No se pudo crear la identidad local');
  }

  return created.value;
}
