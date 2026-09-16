import { useCallback } from 'react';
import { Alert } from 'react-native';

export function useCancelPendingInvitationAction(
  cancelInvitation: () => Promise<void>,
): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    try {
      await cancelInvitation();
    } catch (caught) {
      Alert.alert(
        'No pudimos cancelar la invitación',
        caught instanceof Error
          ? caught.message
          : 'Inténtalo de nuevo en un momento.',
      );
      throw caught;
    }
  }, [cancelInvitation]);
}
