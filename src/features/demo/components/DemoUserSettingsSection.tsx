import { useState } from 'react';
import { Alert } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
} from '@/components/layout/SettingsList/SettingsList';
import { deleteDemoUser } from '@/features/demo/services/demoUserService';
import type { DemoSession } from '@/state/demoSession/demoSessionStore';
import { categoryColors } from '@/theme/categoryColors';

/**
 * Sustituye a la sección Cuenta mientras hay un usuario demo: no existe una
 * sesión real que cerrar, solo datos ficticios que borrar del dispositivo.
 */
export function DemoUserSettingsSection({
  demoSession,
}: {
  demoSession: DemoSession;
}) {
  const [isDeleting, setDeleting] = useState(false);

  const handleDelete = () => {
    setDeleting(true);
    deleteDemoUser().catch((error: unknown) => {
      console.error('[demo] No se pudo eliminar el usuario demo', error);
      setDeleting(false);
      Alert.alert(
        'No pudimos eliminar el usuario demo',
        'Inténtalo de nuevo en unos momentos.',
      );
    });
  };

  const confirmDelete = () => {
    if (isDeleting) return;
    Alert.alert(
      'Eliminar usuario demo',
      `Se borrarán ${demoSession.displayName}, ${demoSession.partnerDisplayName} y todos sus datos ficticios de este dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: handleDelete },
      ],
    );
  };

  return (
    <SettingsSection
      emphasizeIcon={false}
      icon="flask-outline"
      title="Usuario demo"
    >
      <SettingsRow
        destructive
        icon="trash-outline"
        iconBackgroundColor={categoryColors.red}
        label="Eliminar usuario demo"
        onPress={confirmDelete}
        value={isDeleting ? 'Eliminando…' : demoSession.email}
      />
    </SettingsSection>
  );
}
