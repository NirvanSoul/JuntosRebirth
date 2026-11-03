import type { Space } from '@/features/spaces/types';
import type { RemoteAccountSpace } from '@/features/sync/gateways/juntossRemoteAccountGateway';

/**
 * Espacio del catálogo local para un espacio remoto ya enlazado a `localId`.
 * Un espacio juntos sin activar sigue esperando a la otra persona.
 */
export function toLocalSpace(
  remoteSpace: RemoteAccountSpace,
  localId: string,
): Space {
  return {
    id: localId,
    name: remoteSpace.name,
    type: remoteSpace.type,
    currency: remoteSpace.currency,
    ...(remoteSpace.type === 'couple'
      ? { isAwaitingPartner: remoteSpace.activatedAt === null }
      : {}),
  };
}
