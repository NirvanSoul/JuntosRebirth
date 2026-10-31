import type {
  TransactionAuthorFilter,
  TransactionAuthorFilterOption,
} from '@/features/activity/components/TransactionFiltersModal';
import type { SpaceMemberProfile } from '@/features/profile/types';
import type { SessionTransaction } from '@/features/transactions/types';
import type { TransactionAuthorContext } from '@/features/transactions/utils/transactionAuthor';

type AuthorFilterContext = TransactionAuthorContext & {
  isSharedSpace: boolean;
};

/** Opciones de autor; vacías en un espacio personal, donde no aportan nada. */
export function getTransactionAuthorFilterOptions({
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

/**
 * Se decide por la pareja y no por lo propio: un movimiento creado antes de
 * iniciar sesión o sin conexión se firma con el id de la instalación, que no
 * coincide con el uuid de quien usa el móvil pero sigue siendo suyo. Solo lo
 * que firmó otra persona conocida del espacio cuenta como de la pareja.
 */
export function matchesTransactionAuthorFilter(
  transaction: SessionTransaction,
  filter: TransactionAuthorFilter | undefined,
  { isSharedSpace, ownUserId, profilesByUserId }: AuthorFilterContext,
): boolean {
  if (!filter || filter === 'all' || !isSharedSpace) return true;

  const { createdBy } = transaction;
  const isPartner = createdBy !== ownUserId && createdBy in profilesByUserId;
  return isPartner === (filter === 'partner');
}
