import { LocalCacheIsolationError } from '@/lib/storage/localCacheIsolationError';
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
 * Tablas con datos de una cuenta. `local_profile` y `local_metadata` quedan
 * fuera: el onboarding los rellena antes de que exista una sesión.
 */
const accountDataTables = [
  'categories',
  'category_budgets',
  'money_accounts',
  'money_account_balances',
  'recurring_transaction_series',
  'transactions',
  'transaction_reminders',
  'transaction_notification_rules',
  'import_batches',
  'import_items',
  'import_merchant_rules',
  'merchant_feedback_queue',
  'space_member_profiles',
  'local_sync_batches',
] as const;

/** La caché contiene algún dato de cuenta, sincronizado o no. */
export async function hasLocalAccountData(
  executor: LocalSqlExecutor,
): Promise<boolean> {
  const row = await executor.getFirstAsync<{ has_data: number }>(
    `SELECT (${accountDataTables
      .map((table) => `EXISTS (SELECT 1 FROM ${table})`)
      .join(' OR ')}) AS has_data`,
  );
  return row?.has_data === 1;
}

async function hasLocalCacheLinksForAccount(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<boolean> {
  const row = await executor.getFirstAsync<ForeignLinkRow>(
    'SELECT user_id FROM remote_entity_links WHERE user_id = ? LIMIT 1',
    userId,
  );
  return row !== null && row !== undefined;
}

export type LocalCacheOwnership =
  /** Declarada de esta cuenta, o con enlaces solo de esta cuenta. */
  | 'current'
  /** Declarada de otra cuenta, o con enlaces de otra cuenta. */
  | 'other_account'
  /** Sin propietario y sin datos de cuenta: puede adoptarse sin riesgo. */
  | 'empty'
  /** Sin propietario ni enlaces, pero con datos: no se puede atribuir. */
  | 'unattributed';

/**
 * Decide a quién pertenece la caché local antes de mostrarla o subirla.
 *
 * Solo se adopta con evidencia: el propietario declarado, enlaces remotos
 * restaurados por esta misma cuenta, o una caché sin datos. Una caché con
 * datos y sin ninguna de esas pruebas puede ser de cualquiera que usara el
 * dispositivo antes del marcador; no se adopta ni se borra (`unattributed`).
 */
export async function classifyLocalCacheOwnership(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<LocalCacheOwnership> {
  const owner = await readLocalCacheOwner(executor);
  if (owner) return owner === userId ? 'current' : 'other_account';
  if (await hasLocalCacheLinksForAnotherAccount(executor, userId)) {
    return 'other_account';
  }
  if (!(await hasLocalAccountData(executor))) return 'empty';
  if (await hasLocalCacheLinksForAccount(executor, userId)) return 'current';
  // Lo creado en el onboarding se asocia a la primera sesión
  // (`JUNTOSS_ONBOARDING_GUIDE.md` §13).
  if (await isUnclaimedOnboardingCache(executor)) return 'current';
  return 'unattributed';
}

const onboardingCacheKey = 'unclaimed_onboarding_cache';

/**
 * Marca la caché como cuaderno del onboarding. Solo si está vacía y sin
 * propietario: así la marca demuestra que todo lo que contenga al iniciar
 * sesión se creó en este flujo, previo a cualquier cuenta, y nunca bendice
 * datos heredados.
 */
export async function markLocalCacheAsOnboardingDraft(
  executor: LocalSqlExecutor,
): Promise<void> {
  if (await readLocalCacheOwner(executor)) return;
  if (await hasLocalAccountData(executor)) return;
  await executor.runAsync(
    `INSERT OR REPLACE INTO local_metadata (key, value) VALUES (?, '1')`,
    onboardingCacheKey,
  );
}

async function isUnclaimedOnboardingCache(
  executor: LocalSqlExecutor,
): Promise<boolean> {
  const row = await executor.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_metadata WHERE key = ?',
    onboardingCacheKey,
  );
  return row?.value === '1';
}

/**
 * Comprueba, antes de subir, que la caché local es de quien firma la
 * petición. Sin propietario declarado tampoco se sube: la inicialización de
 * la sesión aún no ha decidido de quién es.
 */
export async function assertLocalCacheOwnedBy(
  executor: LocalSqlExecutor,
  userId: string,
): Promise<void> {
  if ((await readLocalCacheOwner(executor)) !== userId) {
    throw new LocalCacheIsolationError('owner_mismatch');
  }
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
  // Con propietario declarado, la marca del onboarding ya no hace falta.
  await executor.runAsync(
    'DELETE FROM local_metadata WHERE key = ?',
    onboardingCacheKey,
  );
}
