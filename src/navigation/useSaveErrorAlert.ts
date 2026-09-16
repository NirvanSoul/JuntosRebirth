import { useCallback } from 'react';
import { Alert } from 'react-native';

export function useSaveErrorAlert(): () => void {
  return useCallback(() => {
    Alert.alert(
      'No pudimos guardar el cambio',
      'Tus datos anteriores siguen intactos. Inténtalo de nuevo.',
    );
  }, []);
}
