import {
  loadRemoteEntityLinks,
  reconcileRemoteEntityLink,
} from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

const provisionalPersonalSpaceId = 'personal';

async function hasLocalOnlyPersonalTransactions(
  database: LocalSqlExecutor,
): Promise<boolean> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM transactions
      WHERE space_id = ? AND sync_status = 'local_only'
      LIMIT 1`,
    provisionalPersonalSpaceId,
  );
  return row !== null && row !== undefined;
}

async function hasIncompatibleVenezuelaPersonalTransactions(
  database: LocalSqlExecutor,
): Promise<boolean> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM transactions
      WHERE space_id = ?
        AND sync_status IN ('local_only', 'pending', 'failed', 'syncing')
        AND currency NOT IN ('USD', 'VES')
      LIMIT 1`,
    provisionalPersonalSpaceId,
  );
  return row !== null && row !== undefined;
}

/**
 * Decide si el espacio provisional previo a la sesión puede adoptar el UUID
 * personal remoto. Un movimiento EUR demuestra que no pertenece al contexto
 * VE: se conserva bajo `personal`, pero se aísla del catálogo venezolano.
 */
export async function preparePersonalSpaceLink(input: {
  countryCode?: string | null;
  database: LocalSqlExecutor;
  personalRemoteId?: string;
  userId: string;
}): Promise<{
  existingSpaceLinks: Map<string, string>;
  shouldKeepProvisionalPersonalSpace: boolean;
}> {
  const existingSpaceLinks = await loadRemoteEntityLinks({
    executor: input.database,
    userId: input.userId,
    entityType: 'space',
  });
  const mustIsolate =
    input.countryCode === 'VE' &&
    input.personalRemoteId !== undefined &&
    (await hasIncompatibleVenezuelaPersonalTransactions(input.database));

  if (
    mustIsolate &&
    input.personalRemoteId !== undefined &&
    existingSpaceLinks.get(input.personalRemoteId) ===
      provisionalPersonalSpaceId
  ) {
    await reconcileRemoteEntityLink({
      executor: input.database,
      userId: input.userId,
      entityType: 'space',
      remoteId: input.personalRemoteId,
      localId: input.personalRemoteId,
    });
    existingSpaceLinks.set(input.personalRemoteId, input.personalRemoteId);
  }

  const shouldKeepProvisionalPersonalSpace =
    !mustIsolate &&
    existingSpaceLinks.size === 0 &&
    input.personalRemoteId !== undefined &&
    (await hasLocalOnlyPersonalTransactions(input.database));

  return { existingSpaceLinks, shouldKeepProvisionalPersonalSpace };
}
