import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

export type RemoteChangesCursor = {
  version: 1;
  serverTime: string;
  activeFinancialContextId: string | null;
  spaceRemoteIds: string[];
};

type MetadataRow = { value: string };

function cursorKey(userId: string): string {
  return `remote_changes_cursor:${userId}`;
}

export async function readRemoteChangesCursor(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<RemoteChangesCursor | null> {
  const row = await executor.getFirstAsync<MetadataRow>(
    'SELECT value FROM local_metadata WHERE key = ?',
    cursorKey(userId),
  );
  if (!row?.value) return null;

  try {
    const parsed = JSON.parse(row.value);
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.serverTime === 'string' &&
      (parsed.activeFinancialContextId === null ||
        typeof parsed.activeFinancialContextId === 'string') &&
      Array.isArray(parsed.spaceRemoteIds) &&
      parsed.spaceRemoteIds.every((id: unknown) => typeof id === 'string')
    ) {
      return {
        version: 1,
        serverTime: parsed.serverTime,
        activeFinancialContextId: parsed.activeFinancialContextId,
        spaceRemoteIds: [...parsed.spaceRemoteIds].sort(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeRemoteChangesCursor(
  executor: LocalSqlExecutor,
  userId: string,
  cursor: Omit<RemoteChangesCursor, 'version'>,
): Promise<void> {
  const data: RemoteChangesCursor = {
    version: 1,
    serverTime: cursor.serverTime,
    activeFinancialContextId: cursor.activeFinancialContextId,
    spaceRemoteIds: [...cursor.spaceRemoteIds].sort(),
  };

  await executor.runAsync(
    `INSERT INTO local_metadata (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    cursorKey(userId),
    JSON.stringify(data),
  );
}

export async function clearRemoteChangesCursor(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<void> {
  await executor.runAsync(
    'DELETE FROM local_metadata WHERE key = ?',
    cursorKey(userId),
  );
}
