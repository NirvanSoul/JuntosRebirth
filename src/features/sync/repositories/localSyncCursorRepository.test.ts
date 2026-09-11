import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';
import {
  clearRemoteChangesCursor,
  readRemoteChangesCursor,
  writeRemoteChangesCursor,
} from './localSyncCursorRepository';

function createMockExecutor(): LocalSqlExecutor {
  const store = new Map<string, string>();

  return {
    getFirstAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
      if (sql.includes('SELECT value FROM local_metadata WHERE key = ?')) {
        const key = params[0] as string;
        const val = store.get(key);
        return val !== undefined ? { value: val } : null;
      }
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
      if (sql.includes('INSERT INTO local_metadata')) {
        const key = params[0] as string;
        const value = params[1] as string;
        store.set(key, value);
      } else if (sql.includes('DELETE FROM local_metadata WHERE key = ?')) {
        const key = params[0] as string;
        store.delete(key);
      }
      return { changes: 1, lastInsertRowId: 1 };
    }),
  };
}

describe('localSyncCursorRepository', () => {
  it('guarda y recupera el cursor correctamente ordenando los remote space IDs', async () => {
    const executor = createMockExecutor();

    await writeRemoteChangesCursor(executor, 'user-1', {
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-b', 'space-a'],
    });

    const cursor = await readRemoteChangesCursor(executor, 'user-1');

    expect(cursor).toEqual({
      version: 1,
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: 'ctx-1',
      spaceRemoteIds: ['space-a', 'space-b'],
    });
  });

  it('devuelve null si no existe cursor para el usuario', async () => {
    const executor = createMockExecutor();

    const cursor = await readRemoteChangesCursor(executor, 'user-inexistente');
    expect(cursor).toBeNull();
  });

  it('devuelve null si el valor almacenado es JSON corrupto o tiene esquema inválido', async () => {
    const executor = createMockExecutor();

    await executor.runAsync(
      'INSERT INTO local_metadata (key, value) VALUES (?, ?)',
      'remote_changes_cursor:user-corrupto',
      '{ invalid-json',
    );

    expect(await readRemoteChangesCursor(executor, 'user-corrupto')).toBeNull();

    await executor.runAsync(
      'INSERT INTO local_metadata (key, value) VALUES (?, ?)',
      'remote_changes_cursor:user-invalid-schema',
      JSON.stringify({ version: 2 }),
    );

    expect(
      await readRemoteChangesCursor(executor, 'user-invalid-schema'),
    ).toBeNull();
  });

  it('elimina el cursor al invocar clearRemoteChangesCursor', async () => {
    const executor = createMockExecutor();

    await writeRemoteChangesCursor(executor, 'user-1', {
      serverTime: '2026-09-11T12:00:00.000Z',
      activeFinancialContextId: null,
      spaceRemoteIds: ['space-1'],
    });

    expect(await readRemoteChangesCursor(executor, 'user-1')).not.toBeNull();

    await clearRemoteChangesCursor(executor, 'user-1');

    expect(await readRemoteChangesCursor(executor, 'user-1')).toBeNull();
  });
});
