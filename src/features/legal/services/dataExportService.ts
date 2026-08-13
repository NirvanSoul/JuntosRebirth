import { Share } from 'react-native';

import { listLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import { createSupabaseDataExportGateway } from '@/features/legal/gateways/supabaseDataExportGateway';
import type { DataExportScope } from '@/features/legal/model/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { listLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

async function buildLocalExportPayload(): Promise<Record<string, unknown>> {
  const [spaces, categories, transactions] = await Promise.all([
    loadSpaces(),
    listLocalCategories(),
    listLocalTransactions(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    scope: 'local',
    spaces: spaces.spaces,
    categories,
    transactions,
  };
}

export type ExportMyDataResult = {
  scope: DataExportScope;
};

/**
 * Arma un JSON con los datos del usuario y abre la hoja de compartir nativa
 * para que decida dónde guardarlo. Sin sesión (modo invitado) exporta los
 * datos locales; con sesión, pide también los datos remotos a la Edge
 * Function `export-user-data`.
 */
export async function exportMyData(): Promise<ExportMyDataResult> {
  const userId = await getAuthenticatedUserId();
  const localPayload = await buildLocalExportPayload();

  const payload = userId
    ? {
        ...localPayload,
        scope: 'account',
        account: await createSupabaseDataExportGateway(
          getConfiguredSupabaseClient(),
        ).exportAccountData(),
      }
    : localPayload;

  await Share.share({
    message: JSON.stringify(payload, null, 2),
    title: 'Mis datos de Juntos',
  });

  return { scope: userId ? 'account' : 'local' };
}
