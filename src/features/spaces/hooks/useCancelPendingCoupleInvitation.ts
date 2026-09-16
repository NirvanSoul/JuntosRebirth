import { useCallback } from 'react';

import { createJuntossInvitationGateway } from '@/features/spaces/gateways/juntossInvitationGateway';
import {
  resolvePersonalSpaceId,
  type SpacesState,
} from '@/features/spaces/types';
import { saveSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import type { Dispatch, SetStateAction } from 'react';

type UseCancelPendingCoupleInvitationInput = {
  hasSession: boolean;
  setError: (error: string | null) => void;
  setState: Dispatch<SetStateAction<SpacesState>>;
  state: SpacesState;
};

/** Revoca la invitación del espacio de pareja que todavía no se ha activado. */
export function useCancelPendingCoupleInvitation({
  hasSession,
  setError,
  setState,
  state,
}: UseCancelPendingCoupleInvitationInput): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    const coupleSpace = state.spaces.find(
      (space) => space.type === 'couple' && space.isAwaitingPartner,
    );
    if (!coupleSpace) return;
    if (!hasSession) {
      throw new Error('Inicia sesión para cancelar la invitación.');
    }

    try {
      const gateway = createJuntossInvitationGateway();
      const invitation = await gateway.getOutgoingInvitation(coupleSpace.id);
      if (!invitation) return;
      await gateway.revokeInvitation(coupleSpace.id, invitation.id);
      const nextSpaces = state.spaces.filter(
        (space) => space.id !== coupleSpace.id,
      );
      const nextState: SpacesState = {
        activeSpaceId:
          state.activeSpaceId === coupleSpace.id
            ? resolvePersonalSpaceId(nextSpaces)
            : state.activeSpaceId,
        spaces: nextSpaces,
      };
      await saveSpaces(nextState);
      setState(nextState);
      setError(null);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'No pudimos cancelar la invitación.';
      setError(message);
      throw new Error(message);
    }
  }, [hasSession, setError, setState, state]);
}
