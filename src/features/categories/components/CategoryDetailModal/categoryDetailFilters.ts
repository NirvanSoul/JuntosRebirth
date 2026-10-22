import type {
  TransactionAuthorFilterOption,
  TransactionFilters,
} from '@/features/activity/components/TransactionFiltersModal';
import type { SpaceMemberProfile } from '@/features/profile/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

/** El detalle abre centrado en el mes en curso; el usuario amplía o acota. */
export function createInitialFilters(
  currency: CurrencyCode,
): TransactionFilters {
  return {
    author: 'all',
    category: [],
    currency,
    date: { period: 'month', selectedDate: new Date() },
    recurrence: 'all',
    type: 'all',
  };
}

export function getCategoryDetailAuthorOptions({
  isSharedSpace,
  ownUserId,
  profilesByUserId,
}: {
  isSharedSpace: boolean;
  ownUserId: string | null;
  profilesByUserId: Readonly<Record<string, SpaceMemberProfile>>;
}): readonly TransactionAuthorFilterOption[] {
  if (!isSharedSpace) return [];

  const partnerName =
    Object.values(profilesByUserId).find(
      (profile) => profile.userId !== ownUserId,
    )?.displayName ?? 'Pareja';
  return [
    { label: 'Ambos', value: 'all' },
    { label: 'Yo', value: 'own' },
    { label: partnerName, value: 'partner' },
  ];
}
