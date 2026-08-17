import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

export type RemoteAccountSpace = {
  remoteId: string;
  name: string;
  type: 'personal' | 'couple' | 'other';
  currency: CurrencyCode;
};

export type RemoteAccountCategory = {
  remoteId: string;
  spaceRemoteId: string;
  name: string;
  icon: string;
  colorToken: string;
  budgetMinor: number | null;
  isDefault: boolean;
  templateKey: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RemoteAccountSnapshot = {
  spaces: readonly RemoteAccountSpace[];
  categories: readonly RemoteAccountCategory[];
  recurringSeries: readonly Record<string, unknown>[];
  transactions: readonly Record<string, unknown>[];
};

export async function fetchRemoteAccountSnapshot(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): Promise<RemoteAccountSnapshot> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Debes iniciar sesión antes de restaurar tus datos');
  }
  const { data: spaces, error: spacesError } = await client
    .from('spaces')
    .select('id, name, type, currency')
    .is('archived_at', null);
  if (spacesError || !spaces) {
    throw new Error('No pudimos recuperar tus espacios');
  }
  const spaceIds = spaces.map((space) => space.id as string);
  if (spaceIds.length === 0) {
    return {
      spaces: [],
      categories: [],
      recurringSeries: [],
      transactions: [],
    };
  }

  const mappedSpaces: RemoteAccountSpace[] = spaces.map((space) => {
    const rawId = space.id;
    const rawName = space.name;
    const rawType = space.type;
    const rawCurrency = space.currency;

    if (
      typeof rawId !== 'string' ||
      rawId.trim().length === 0 ||
      typeof rawName !== 'string' ||
      rawName.trim().length === 0 ||
      (rawType !== 'personal' && rawType !== 'couple' && rawType !== 'other') ||
      typeof rawCurrency !== 'string' ||
      !isCurrencyCode(rawCurrency)
    ) {
      throw new Error(
        `[sync] Integridad comprometida en espacio remoto ${String(rawId)}: type=${String(rawType)}, currency=${String(rawCurrency)}`,
      );
    }

    return {
      remoteId: rawId,
      name: rawName,
      type: rawType,
      currency: rawCurrency,
    };
  });

  const { data: categories, error: categoriesError } = await client
    .from('categories')
    .select(
      'id, space_id, name, icon, color_token, budget_amount_minor, is_default, template_key, is_archived, created_at, updated_at',
    )
    .in('space_id', spaceIds);
  if (categoriesError || !categories) {
    throw new Error('No pudimos recuperar tus categorías');
  }
  const [
    { data: recurringSeries, error: seriesError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    client
      .from('recurring_transaction_series')
      .select(
        'id, space_id, category_id, created_by, type, amount_minor, currency, title, frequency, starts_on, generated_occurrences, next_occurrence_on, is_archived, created_at, updated_at, archived_at',
      )
      .in('space_id', spaceIds),
    client
      .from('transactions')
      .select(
        'id, space_id, category_id, created_by, type, amount_minor, currency, title, occurred_on, recurrence, recurrence_group_id, recurrence_series_id, source_local_transaction_id, is_archived, created_at, updated_at, archived_at',
      )
      .in('space_id', spaceIds),
  ]);
  if (seriesError || transactionsError || !recurringSeries || !transactions) {
    throw new Error('No pudimos recuperar tus movimientos');
  }
  return {
    spaces: mappedSpaces,
    categories: categories.map((category) => ({
      remoteId: category.id as string,
      spaceRemoteId: category.space_id as string,
      name: category.name as string,
      icon: category.icon as string,
      colorToken: category.color_token as string,
      budgetMinor: category.budget_amount_minor as number | null,
      isDefault: category.is_default as boolean,
      templateKey: category.template_key as string | null,
      isArchived: category.is_archived as boolean,
      createdAt: category.created_at as string,
      updatedAt: category.updated_at as string,
    })),
    recurringSeries: recurringSeries as Record<string, unknown>[],
    transactions: transactions as Record<string, unknown>[],
  };
}
