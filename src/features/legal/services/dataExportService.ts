import { Share } from 'react-native';

import { listLocalMoneyAccounts } from '@/features/accounts/repositories/localMoneyAccountRepository';
import { listLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import { createJuntossDataExportGateway } from '@/features/legal/gateways/juntossDataExportGateway';
import type { DataExportScope } from '@/features/legal/model/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { listLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';

async function buildLocalExportPayload(): Promise<Record<string, unknown>> {
  const [spaces, categories, moneyAccounts, transactions] = await Promise.all([
    loadSpaces(),
    listLocalCategories(),
    listLocalMoneyAccounts(),
    listLocalTransactions(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    scope: 'local',
    spaces: spaces.spaces,
    categories,
    moneyAccounts,
    transactions,
  };
}

export type ExportMyDataResult = {
  scope: DataExportScope;
};

/**
 * Arma un JSON con los datos del usuario y abre la hoja de compartir nativa
 * para que decida dónde guardarlo. Sin sesión (modo invitado) exporta los
 * datos locales; con sesión, pide también los remotos a la API.
 */
export async function exportMyData(): Promise<ExportMyDataResult> {
  const userId = await getAuthenticatedUserId();
  const localPayload = await buildLocalExportPayload();

  const payload = userId
    ? {
        ...localPayload,
        scope: 'account',
        account: await createJuntossDataExportGateway().exportAccountData(),
      }
    : localPayload;

  await Share.share({
    message: JSON.stringify(payload, null, 2),
    title: 'Mis datos de Juntos',
  });

  return { scope: userId ? 'account' : 'local' };
}
