import type { TransactionAuthorFilterOption } from '@/features/activity/components/TransactionFiltersModal';
import type { SpaceMemberProfile } from '@/features/profile/types';

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
