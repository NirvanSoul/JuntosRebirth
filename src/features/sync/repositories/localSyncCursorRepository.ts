import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

export type RemoteChangesCursor = {
  version: 1;
  serverTime: string;
  activeFinancialContextId: string | null;
  spaceRemoteIds: string[];
};

type MetadataRow = { value: string };

/**
 * Cuántas veces se borró el cursor de cada cuenta en esta ejecución. Una
 * restauración lo anota antes de pedir datos a la red y solo escribe su
 * cursor si no cambió: si una subida lo borró mientras tanto (el servidor
 * conservó otra versión), escribirlo desharía ese borrado.
 */
const cursorGenerationByUserId = new Map<string, number>();

export function getRemoteChangesCursorGeneration(userId: string): number {
  return cursorGenerationByUserId.get(userId) ?? 0;
}

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
  options?: {
    /** `getRemoteChangesCursorGeneration` anotada antes de pedir los datos. */
    expectedGeneration?: number;
  },
): Promise<boolean> {
  if (
    options?.expectedGeneration !== undefined &&
    options.expectedGeneration !== getRemoteChangesCursorGeneration(userId)
  ) {
    // El cursor se borró después de pedir estos datos: la próxima
    // restauración tiene que ser completa.
    return false;
  }
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
  return true;
}

/**
 * Escribe el cursor de una restauración salvo que se haya borrado desde que
 * anotó `expectedGeneration` (ver `getRemoteChangesCursorGeneration`).
 */
export function writeCursorUnlessCleared(
  executor: LocalSqlExecutor,
  userId: string,
  expectedGeneration: number,
  cursor: Omit<RemoteChangesCursor, 'version'>,
): Promise<boolean> {
  return writeRemoteChangesCursor(executor, userId, cursor, {
    expectedGeneration,
  });
}

export async function clearRemoteChangesCursor(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<void> {
  // Se anota antes del borrado: una restauración que compruebe la
  // generación mientras este se ejecuta ya ve el cambio.
  cursorGenerationByUserId.set(
    userId,
    getRemoteChangesCursorGeneration(userId) + 1,
  );
  await executor.runAsync(
    'DELETE FROM local_metadata WHERE key = ?',
    cursorKey(userId),
  );
}
