import { listRemoteSpaces } from '@/services/api/spaces';
import type { Space } from '@/features/spaces/types';
import { isCurrencyCode } from '@/lib/currency/currencyCatalog';

export class RemoteSpaceIntegrityError extends Error {
  override readonly name = 'RemoteSpaceIntegrityError';
}

export const remoteSpaceIntegrityErrorMessage =
  'No pudimos comprobar tu espacio de pareja por un error de integridad.';

/** Lee y valida el único espacio de pareja visible para la sesión. */
export async function fetchRemoteCoupleSpace(): Promise<Space | null> {
  const data = (await listRemoteSpaces()).find(
    (space) => space.type === 'couple',
  );
  if (!data) return null;

  if (
    typeof data.id !== 'string' ||
    data.id.trim().length === 0 ||
    typeof data.name !== 'string' ||
    data.name.trim().length === 0 ||
    typeof data.currency !== 'string' ||
    !isCurrencyCode(data.currency)
  ) {
    throw new RemoteSpaceIntegrityError(
      `Datos de espacio de pareja remoto inválidos (id: ${String(data.id)}, name: ${String(data.name)}, currency: ${String(data.currency)})`,
    );
  }

  return {
    id: data.id,
    name: data.name,
    type: 'couple',
    currency: data.currency,
    isAwaitingPartner: data.activatedAt === null,
  };
}
