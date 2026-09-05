import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

type SyncAccountRow = { user_id: string };
type ForeignLinkRow = { user_id: string };

/**
 * `local_sync_account` es el propietario declarado de la caché local: la cuenta
 * cuyos datos contiene. Sin ese marcador no hay forma de distinguir una caché
 * que pertenece a quien acaba de entrar —y cuyo trabajo sin conexión hay que
 * conservar— de una heredada de otra cuenta, que debe descartarse antes de
 * restaurar (`API.md`, «Sesión y restauración»).
 */
export async function readLocalCacheOwner(
  executor: LocalSqlExecutor,
): Promise<string | null> {
  const row = await executor.getFirstAsync<SyncAccountRow>(
    'SELECT user_id FROM local_sync_account WHERE singleton_id = 1',
  );
  return row?.user_id ?? null;
}

/**
 * Los dispositivos anteriores al marcador tienen la caché sin propietario
 * declarado. `remote_entity_links` sí lleva el `user_id` de quien restauró cada
 * enlace, así que sirve de prueba secundaria: si hay enlaces de otra cuenta, la
 * caché no es de quien entra ahora.
 */
export async function hasLocalCacheLinksForAnotherAccount(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<boolean> {
  const row = await executor.getFirstAsync<ForeignLinkRow>(
    'SELECT user_id FROM remote_entity_links WHERE user_id <> ? LIMIT 1',
    userId,
  );
  return row !== null && row !== undefined;
}

/**
 * Decide si la caché local es de otra cuenta.
 *
 * Solo responde que sí ante una prueba positiva. Una caché sin propietario y
 * sin enlaces no demuestra nada: puede ser el trabajo sin conexión de quien
 * entra, creado antes de que una restauración llegara a completarse. Ante la
 * duda se conserva, porque descartarla destruiría datos que nunca llegaron a
 * subirse, mientras que conservarla de más se corrige en la siguiente
 * sincronización.
 */
export async function localCacheBelongsToAnotherAccount(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<boolean> {
  const owner = await readLocalCacheOwner(executor);
  if (owner) return owner !== userId;
  return hasLocalCacheLinksForAnotherAccount(executor, userId);
}

/**
 * Deja constancia de a qué cuenta pertenece la caché local.
 *
 * Hasta ahora nadie escribía esta fila, así que `prepareLocalMerchantRuleSync`
 * y `prepareLocalImportBatchSync` —que la exigen para subir sus datos— fallaban
 * siempre con «no están asociadas a esta cuenta».
 */
export async function claimLocalCacheOwnership(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<void> {
  if (!userId) throw new Error('La sesión autenticada no es válida');
  await executor.runAsync(
    `INSERT INTO local_sync_account (singleton_id, user_id, confirmed_at)
     VALUES (1, ?, ?)
     ON CONFLICT (singleton_id) DO UPDATE SET
       user_id = excluded.user_id,
       confirmed_at = excluded.confirmed_at`,
    userId,
    new Date().toISOString(),
  );
}
