import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import type { LoginInput } from '@/features/auth/types';
import { listLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { initialSpacesState } from '@/features/spaces/types';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { syncPendingLocalDataForCurrentSession } from '@/features/sync/services/migrateAuthenticatedGuestData';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { listLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';

export type LoginOutcome =
  { status: 'signed-in' } | { status: 'needs-merge-confirmation' };

/**
 * Señal de "este dispositivo tiene datos de invitado reales", no solo el
 * estado por defecto que trae toda instalación nueva (únicamente el espacio
 * Personal y categorías por defecto). Cualquiera de estas tres cosas implica
 * que la persona usó la app antes de crear cuenta: una transacción, una
 * categoría propia, o un espacio adicional al que trae la app de fábrica
 * (incluido un espacio de pareja local, que `useSpaces` fusiona desde
 * Better Auth y por tanto también cuenta aquí como "más que el estado de
 * fábrica").
 */
async function hasLocalGuestDataWorthMigrating(): Promise<boolean> {
  const [transactions, categories, spacesState] = await Promise.all([
    listLocalTransactions(),
    listLocalCategories(),
    loadSpaces(),
  ]);

  if (transactions.length > 0) return true;
  if (categories.some((category) => !category.isDefault)) return true;
  if (spacesState.spaces.length > initialSpacesState.spaces.length) return true;

  return false;
}

export async function login(input: LoginInput): Promise<LoginOutcome> {
  const gateway = createJuntossAuthGateway();
  await gateway.signInWithPassword(input);
  await bootstrapRemoteAccount();

  const hasGuestData = await hasLocalGuestDataWorthMigrating();
  if (!hasGuestData) {
    await restoreRemoteAccountForCurrentSession();
    return { status: 'signed-in' };
  }

  return { status: 'needs-merge-confirmation' };
}

export async function confirmGuestDataMerge(): Promise<void> {
  const { spaces } = await loadSpaces();
  await syncPendingLocalDataForCurrentSession({
    spaces,
    confirmOwnership: true,
  });
}
