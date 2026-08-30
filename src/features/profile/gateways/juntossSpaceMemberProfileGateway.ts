import type { SpaceMemberProfile } from '@/features/profile/types';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';
import { apiClient } from '@/services/api/juntossApiClient';

type RemoteMember = {
  userId?: unknown;
  displayName?: unknown;
  avatarPath?: unknown;
  avatarUpdatedAt?: unknown;
  defaultCurrency?: unknown;
};

type ListMembersResponse = { data: { members: RemoteMember[] } };

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Censo de un espacio compartido: quién lo comparte, cómo se llama y de cuándo
 * es su foto.
 *
 * `GET /v1/spaces/:spaceId/members` ya trae `avatarPath` y `avatarUpdatedAt`,
 * que es exactamente lo que alimenta la caché `space_member_profiles`. La
 * autorización la resuelve el servidor por membresía activa, así que el
 * cliente no filtra nada.
 *
 * `avatarUri` se queda a `null` a propósito: es la copia local del archivo y la
 * rellena `cacheMemberAvatars` tras descargarla. El servidor solo dice cuál es
 * la versión vigente.
 */
export async function fetchSpaceMemberProfiles(
  spaceId: string,
): Promise<SpaceMemberProfile[]> {
  const response = await apiClient.get<ListMembersResponse>(
    `/v1/spaces/${encodeURIComponent(spaceId)}/members`,
  );

  return response.data.members.flatMap((member) => {
    const userId = optionalString(member.userId);
    if (!userId) return [];

    const defaultCurrency = optionalString(member.defaultCurrency);
    return [
      {
        userId,
        displayName: optionalString(member.displayName),
        avatarPath: optionalString(member.avatarPath),
        avatarUpdatedAt: optionalString(member.avatarUpdatedAt),
        avatarUri: null,
        defaultCurrency:
          defaultCurrency && isCurrencyCode(defaultCurrency)
            ? defaultCurrency
            : null,
      },
    ];
  });
}
