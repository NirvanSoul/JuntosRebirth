import {
  applyRemoteCollections,
  createLinkResolver,
} from '@/features/sync/services/applyRemoteCollections';
import {
  fetchRemoteAccountChanges,
  fetchRemoteAccountSnapshot,
  type RemoteAccountChanges,
  type RemoteAccountSnapshot,
} from '@/features/sync/gateways/juntossRemoteAccountGateway';
import {
  readRemoteChangesCursor,
  type RemoteChangesCursor,
  writeRemoteChangesCursor,
} from '@/features/sync/repositories/localSyncCursorRepository';
import { loadRemoteEntityLinks } from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import {
  getSpacesCatalogueRevision,
  updateSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import type { Space } from '@/features/spaces/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { fetchRemoteImportReviews } from '@/features/import/gateways/juntossImportReviewGateway';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { restoreRemoteImportReviews } from '@/features/sync/services/restoreRemoteImportReviews';
import { ApiError } from '@/services/api/client';

export { applyRemoteCollections };

export type RestoredRemoteAccount = {
  spaces: readonly Space[];
  localCategoryIdByRemoteId: ReadonlyMap<string, string>;
  localSpaceIdByRemoteId: ReadonlyMap<string, string>;
};

export type RestoreOutcome = {
  mode: 'full' | 'delta';
  receivedRows: number;
  catalogueChanged: boolean;
};

export type RestoredRemoteAccountWithOutcome = RestoredRemoteAccount & {
  outcome: RestoreOutcome;
};

type InFlightRestore = {
  mode: 'full' | 'delta';
  task: Promise<RestoredRemoteAccountWithOutcome>;
};

const restoreInFlightByUserId = new Map<string, InFlightRestore>();

const CURSOR_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const provisionalPersonalSpaceId = 'personal';

/**
 * Un snapshot completo solo recupera incoherencias de catálogo o de datos.
 * Repetirlo cuando el transporte acaba de cortarse duplica tráfico y hace más
 * probable que el siguiente request falle también. Esos errores los debe
 * reintentar el polling con backoff conservando el cursor actual.
 */
function shouldRetryDeltaWithoutFullRestore(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;

  return (
    error.code === 'NETWORK_ERROR' ||
    error.status === 401 ||
    error.status === 408 ||
    error.status === 425 ||
    error.status === 429 ||
    error.status >= 500
  );
}

async function hasLocalOnlyPersonalTransactions(
  database: Awaited<ReturnType<typeof getLocalDatabase>>,
): Promise<boolean> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM transactions
      WHERE space_id = ? AND sync_status = 'local_only'
      LIMIT 1`,
    provisionalPersonalSpaceId,
  );
  return row !== null && row !== undefined;
}

export async function restoreRemoteAccount(input: {
  userId: string;
  snapshot: RemoteAccountSnapshot;
  expectedSpacesCatalogueRevision?: number;
}): Promise<RestoredRemoteAccount> {
  const catalogueRevision =
    input.expectedSpacesCatalogueRevision ?? getSpacesCatalogueRevision();
  const database = await getLocalDatabase();
  const personalRemoteId = input.snapshot.spaces.find(
    (space) => space.type === 'personal',
  )?.remoteId;
  const existingSpaceLinks = await loadRemoteEntityLinks({
    executor: database,
    userId: input.userId,
    entityType: 'space',
  });
  // Los importes introducidos antes de iniciar sesión pertenecen al espacio
  // provisional `personal`. En la primera restauración, enlazar ese espacio
  // con su UUID remoto evita que queden fuera de la subida posterior.
  const shouldKeepProvisionalPersonalSpace =
    existingSpaceLinks.size === 0 &&
    personalRemoteId !== undefined &&
    (await hasLocalOnlyPersonalTransactions(database));
  const localSpaceIdByRemoteId = new Map<string, string>();
  const remoteSpaces: Space[] = [];

  const linkSpace = await createLinkResolver({
    executor: database,
    userId: input.userId,
    entityType: 'space',
    existingLinks: existingSpaceLinks,
    localIdForUnlinkedRemote: (remoteId, existingLinks) =>
      shouldKeepProvisionalPersonalSpace &&
      existingLinks.size === 0 &&
      remoteId === personalRemoteId
        ? provisionalPersonalSpaceId
        : remoteId,
  });
  for (const remoteSpace of input.snapshot.spaces) {
    const localId = (await linkSpace(remoteSpace.remoteId))!;
    localSpaceIdByRemoteId.set(remoteSpace.remoteId, localId);
    remoteSpaces.push({
      id: localId,
      name: remoteSpace.name,
      type: remoteSpace.type,
      currency: remoteSpace.currency,
      ...(remoteSpace.type === 'couple'
        ? { isAwaitingPartner: remoteSpace.activatedAt === null }
        : {}),
    });
  }

  const spaces = remoteSpaces;
  const personalSpace = spaces.find((space) => space.type === 'personal');
  const fallbackActiveSpaceId = personalSpace?.id ?? spaces[0]?.id;
  if (!fallbackActiveSpaceId) {
    throw new Error('La cuenta remota no tiene espacios activos');
  }

  const currencyBySpaceRemoteId = new Map(
    input.snapshot.spaces.map((space) => [space.remoteId, space.currency]),
  );

  let localCategoryIdByRemoteId = new Map<string, string>();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const result = await applyRemoteCollections(transaction, {
      userId: input.userId,
      collections: input.snapshot,
      localSpaceIdByRemoteId,
      currencyBySpaceRemoteId,
      linkMode: 'full',
    });
    localCategoryIdByRemoteId = result.localCategoryIdByRemoteId;
  });

  // El selector solo se confirma tras terminar la restauración financiera.
  // Si SQLite rechaza el snapshot, conserva el catálogo y estado anterior.
  await updateSpaces(
    (stored) => ({
      spaces,
      activeSpaceId: spaces.some((space) => space.id === stored.activeSpaceId)
        ? stored.activeSpaceId
        : fallbackActiveSpaceId,
    }),
    { ifCatalogueRevision: catalogueRevision },
  );

  if (input.snapshot.serverTime) {
    const spaceRemoteIds = input.snapshot.spaces.map((s) => s.remoteId).sort();
    await writeRemoteChangesCursor(database, input.userId, {
      serverTime: input.snapshot.serverTime,
      activeFinancialContextId: input.snapshot.activeFinancialContextId,
      spaceRemoteIds,
    });
  }

  return { spaces, localCategoryIdByRemoteId, localSpaceIdByRemoteId };
}

export type ApplyRemoteChangesResult =
  | { needsFullRestore: true }
  | ({ needsFullRestore?: false } & RestoredRemoteAccount & {
        outcome: {
          mode: 'delta';
          receivedRows: number;
          catalogueChanged: boolean;
        };
      });

export async function applyRemoteChanges(input: {
  userId: string;
  changes: RemoteAccountChanges;
  cursor: RemoteChangesCursor;
  expectedSpacesCatalogueRevision?: number;
}): Promise<ApplyRemoteChangesResult> {
  const catalogueRevision =
    input.expectedSpacesCatalogueRevision ?? getSpacesCatalogueRevision();
  const database = await getLocalDatabase();

  // 1. Contexto financiero distinto → requiere restauración completa
  if (
    input.changes.activeFinancialContextId !==
    input.cursor.activeFinancialContextId
  ) {
    return { needsFullRestore: true };
  }

  // 2. Conjunto de espacios distinto → requiere restauración completa
  const currentSpaceRemoteIds = input.changes.spaces
    .map((s) => s.remoteId)
    .sort();
  if (
    currentSpaceRemoteIds.length !== input.cursor.spaceRemoteIds.length ||
    currentSpaceRemoteIds.some((id, i) => id !== input.cursor.spaceRemoteIds[i])
  ) {
    return { needsFullRestore: true };
  }

  // 3. Guarda extra: cursor con más de 24 horas → restauración completa
  const cursorTime = new Date(input.cursor.serverTime).getTime();
  if (isNaN(cursorTime) || Date.now() - cursorTime > CURSOR_MAX_AGE_MS) {
    return { needsFullRestore: true };
  }

  const localSpaceIdByRemoteId = new Map<string, string>();
  const linkSpace = await createLinkResolver({
    executor: database,
    userId: input.userId,
    entityType: 'space',
  });

  const remoteSpaces: Space[] = [];
  for (const remoteSpace of input.changes.spaces) {
    const localId = (await linkSpace(remoteSpace.remoteId))!;
    localSpaceIdByRemoteId.set(remoteSpace.remoteId, localId);
    remoteSpaces.push({
      id: localId,
      name: remoteSpace.name,
      type: remoteSpace.type,
      currency: remoteSpace.currency,
      ...(remoteSpace.type === 'couple'
        ? { isAwaitingPartner: remoteSpace.activatedAt === null }
        : {}),
    });
  }

  const spaces = remoteSpaces;
  let catalogueChanged = false;

  await updateSpaces(
    (stored) => {
      catalogueChanged =
        spaces.length !== stored.spaces.length ||
        spaces.some((incoming) => {
          const matching = stored.spaces.find((s) => s.id === incoming.id);
          if (!matching) return true;
          return (
            matching.name !== incoming.name ||
            matching.currency !== incoming.currency ||
            matching.isAwaitingPartner !== incoming.isAwaitingPartner
          );
        });

      if (!catalogueChanged) return stored;

      const personalSpace = spaces.find((space) => space.type === 'personal');
      const fallbackActiveSpaceId = personalSpace?.id ?? spaces[0]?.id;
      return {
        spaces,
        activeSpaceId: spaces.some((space) => space.id === stored.activeSpaceId)
          ? stored.activeSpaceId
          : (fallbackActiveSpaceId ?? stored.activeSpaceId),
      };
    },
    { ifCatalogueRevision: catalogueRevision },
  );

  const currencyBySpaceRemoteId = new Map(
    input.changes.spaces.map((space) => [space.remoteId, space.currency]),
  );

  const totalDeltaRows =
    input.changes.categories.length +
    input.changes.moneyAccounts.length +
    input.changes.recurringSeries.length +
    input.changes.transactions.length;

  if (totalDeltaRows === 0) {
    await writeRemoteChangesCursor(database, input.userId, {
      serverTime: input.changes.serverTime,
      activeFinancialContextId: input.changes.activeFinancialContextId,
      spaceRemoteIds: currentSpaceRemoteIds,
    });
    return {
      needsFullRestore: false,
      spaces,
      localCategoryIdByRemoteId: new Map(),
      localSpaceIdByRemoteId,
      outcome: { mode: 'delta', receivedRows: 0, catalogueChanged },
    };
  }

  let appliedResult: {
    receivedRows: number;
    localCategoryIdByRemoteId: Map<string, string>;
  };
  await database.withExclusiveTransactionAsync(async (transaction) => {
    appliedResult = await applyRemoteCollections(transaction, {
      userId: input.userId,
      collections: input.changes,
      localSpaceIdByRemoteId,
      currencyBySpaceRemoteId,
      linkMode: 'delta',
    });
  });

  await writeRemoteChangesCursor(database, input.userId, {
    serverTime: input.changes.serverTime,
    activeFinancialContextId: input.changes.activeFinancialContextId,
    spaceRemoteIds: currentSpaceRemoteIds,
  });

  return {
    needsFullRestore: false,
    spaces,
    localCategoryIdByRemoteId: appliedResult!.localCategoryIdByRemoteId,
    localSpaceIdByRemoteId,
    outcome: {
      mode: 'delta',
      receivedRows: appliedResult!.receivedRows,
      catalogueChanged,
    },
  };
}

export async function restoreRemoteAccountForCurrentSession(options?: {
  mode?: 'full' | 'delta';
}): Promise<RestoredRemoteAccountWithOutcome> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('Debes iniciar sesión antes de restaurar tus datos');
  }

  const requestedMode = options?.mode ?? 'full';
  const existing = restoreInFlightByUserId.get(userId);

  if (requestedMode === 'delta' && existing) {
    return existing.task;
  }
  if (requestedMode === 'full' && existing?.mode === 'full') {
    return existing.task;
  }

  const runTask = async (): Promise<RestoredRemoteAccountWithOutcome> => {
    if (requestedMode === 'full' && existing) {
      await existing.task.catch(() => undefined);
    }

    const database = await getLocalDatabase();

    if (requestedMode === 'delta') {
      const cursor = await readRemoteChangesCursor(database, userId);
      if (cursor) {
        try {
          const catalogueRevision = getSpacesCatalogueRevision();
          const changes = await fetchRemoteAccountChanges(cursor.serverTime);
          const result = await applyRemoteChanges({
            userId,
            changes,
            cursor,
            expectedSpacesCatalogueRevision: catalogueRevision,
          });
          if (!result.needsFullRestore) {
            return result;
          }
        } catch (error) {
          if (shouldRetryDeltaWithoutFullRestore(error)) {
            throw error;
          }
          console.error(
            '[sync] Delta falló, recurriendo a full restore:',
            error,
          );
        }
      }
    }

    // Full restore
    const catalogueRevision = getSpacesCatalogueRevision();
    const [snapshot, reviews] = await Promise.all([
      fetchRemoteAccountSnapshot(),
      fetchRemoteImportReviews(),
    ]);
    const restored = await restoreRemoteAccount({
      userId,
      snapshot,
      expectedSpacesCatalogueRevision: catalogueRevision,
    });
    await restoreRemoteImportReviews({ reviews, restored });
    const receivedRows =
      snapshot.categories.length +
      snapshot.moneyAccounts.length +
      snapshot.recurringSeries.length +
      snapshot.transactions.length;

    return {
      ...restored,
      outcome: { mode: 'full', receivedRows, catalogueChanged: true },
    };
  };

  const taskPromise = runTask().finally(() => {
    if (restoreInFlightByUserId.get(userId)?.task === taskPromise) {
      restoreInFlightByUserId.delete(userId);
    }
  });

  restoreInFlightByUserId.set(userId, {
    mode: requestedMode,
    task: taskPromise,
  });

  return taskPromise;
}
