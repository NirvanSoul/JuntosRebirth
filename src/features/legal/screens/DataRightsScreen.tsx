import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  SettingsDivider,
  SettingsSection,
  SettingsRow,
} from '@/components/layout/SettingsList/SettingsList';
import { Text } from '@/components/ui/Text/Text';
import { exportMyData } from '@/features/legal/services/dataExportService';
import {
  deleteAccountAndData,
  deleteDataButKeepAccount,
} from '@/features/legal/services/dataDeletionService';
import type { DataDeletionScope } from '@/features/legal/model/types';
import { categoryColors } from '@/theme/categoryColors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type DataRightsScreenProps = {
  onClose: () => void;
  visible: boolean;
};

type DeletionState =
  | { step: 'idle' }
  | { step: 'confirming'; scope: Exclude<DataDeletionScope, 'local'> }
  | { step: 'deleting'; scope: Exclude<DataDeletionScope, 'local'> }
  | { step: 'done'; scope: DataDeletionScope }
  | {
      step: 'error';
      scope: Exclude<DataDeletionScope, 'local'>;
      message: string;
      detail: string | null;
    };

/**
 * Retraso obligatorio antes de que "Sí, eliminar" quede activo: evita que un
 * toque accidental justo después de abrir la confirmación borre los datos.
 */
const confirmDeletionDelayMs = 5000;
const confirmDeletionDelaySeconds = confirmDeletionDelayMs / 1000;

export function DataRightsScreen({ onClose, visible }: DataRightsScreenProps) {
  const styles = useThemedStyles((colors) =>
    StyleSheet.create({
      container: { flex: 1, gap: spacing.lg },
      header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
      },
      headerText: { flex: 1, gap: spacing.xs },
      body: { gap: spacing.md },
      warningCard: { gap: spacing.sm },
      progressTrack: {
        height: 4,
        borderRadius: radii.round,
        backgroundColor: colors.border,
        overflow: 'hidden',
      },
      progressFill: {
        height: '100%',
        borderRadius: radii.round,
        backgroundColor: categoryColors.red,
      },
      actionsRow: { flexDirection: 'row', gap: spacing.md },
      actionButton: { flex: 1 },
      destructiveButton: { backgroundColor: categoryColors.red },
    }),
  );
  const [isExporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deletion, setDeletion] = useState<DeletionState>({ step: 'idle' });
  const [secondsRemaining, setSecondsRemaining] = useState(
    confirmDeletionDelaySeconds,
  );
  const confirmProgress = useSharedValue(0);
  const confirmProgressStyle = useAnimatedStyle(() => ({
    width: `${confirmProgress.value * 100}%`,
  }));

  useEffect(() => {
    if (deletion.step !== 'confirming') {
      confirmProgress.value = 0;
      return;
    }

    setSecondsRemaining(confirmDeletionDelaySeconds);
    confirmProgress.value = 0;
    confirmProgress.value = withTiming(1, {
      duration: confirmDeletionDelayMs,
      easing: Easing.linear,
    });

    const intervalId = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deletion.step, confirmProgress]);

  const handleExport = () => {
    setExporting(true);
    setExportError(null);
    void exportMyData()
      .catch(() =>
        setExportError('No pudimos preparar tus datos. Inténtalo de nuevo.'),
      )
      .finally(() => setExporting(false));
  };

  const handleConfirmDeletion = () => {
    if (secondsRemaining > 0 || deletion.step !== 'confirming') return;

    const { scope } = deletion;
    setDeletion({ step: 'deleting', scope });
    const deletionRequest =
      scope === 'account' ? deleteAccountAndData() : deleteDataButKeepAccount();
    void deletionRequest
      .then(() => setDeletion({ step: 'done', scope }))
      .catch((error: unknown) =>
        setDeletion({
          step: 'error',
          scope,
          message: 'No pudimos completar la eliminación. Inténtalo de nuevo.',
          // Sin la causa concreta, un fallo de red y uno del servidor se ven
          // igual y no hay forma de diagnosticarlo con el usuario delante.
          detail: error instanceof Error ? error.message : null,
        }),
      );
  };

  const handleClose = () => {
    setDeletion({ step: 'idle' });
    setExportError(null);
    onClose();
  };

  const confirmationCopy =
    deletion.step === 'confirming'
      ? deletion.scope === 'account'
        ? {
            title: 'Esta acción no se puede deshacer',
            body: 'Se eliminarán tus movimientos, categorías y recordatorios. También se cerrará tu sesión y se eliminará tu perfil; los movimientos de un espacio compartido se anonimizan en lugar de romper los datos de la otra persona.',
            confirmLabel: 'Sí, eliminar cuenta',
            testID: 'confirm-account-deletion',
          }
        : {
            title: 'Eliminarás todos tus datos',
            body: 'Se eliminarán tus movimientos, categorías, cuentas, importaciones, recordatorios y perfil de la nube y de este dispositivo. Tu cuenta seguirá existiendo, pero cerraremos la sesión para proteger el borrado.',
            confirmLabel: 'Sí, eliminar mis datos',
            testID: 'confirm-data-deletion',
          }
      : null;

  return (
    <AppModal
      containsScrollable
      onClose={handleClose}
      stackBehavior="push"
      testID="data-rights-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Tus datos
            </Text>
            <Text tone="secondary" variant="label">
              Descarga una copia de tu información o solicita su eliminación.
            </Text>
          </View>
          <ModalCloseButton onPress={handleClose} />
        </View>

        {deletion.step === 'idle' || deletion.step === 'confirming' ? (
          <View style={styles.body}>
            <SettingsSection icon="download-outline" title="Exportar">
              <SettingsRow
                icon="cloud-download-outline"
                iconBackgroundColor={categoryColors.blue}
                label="Descargar mis datos"
                onPress={handleExport}
                value={isExporting ? 'Preparando…' : undefined}
              />
            </SettingsSection>
            {exportError ? (
              <Text tone="expense" variant="footnote">
                {exportError}
              </Text>
            ) : null}

            <SettingsSection icon="trash-outline" title="Eliminar">
              <SettingsRow
                destructive
                icon="trash-outline"
                iconBackgroundColor={categoryColors.red}
                label="Eliminar mis datos"
                onPress={() =>
                  setDeletion({ step: 'confirming', scope: 'data' })
                }
                value="Conservar cuenta"
              />
              <SettingsDivider />
              <SettingsRow
                destructive
                icon="person-remove-outline"
                iconBackgroundColor={categoryColors.red}
                label="Eliminar cuenta y datos"
                onPress={() =>
                  setDeletion({ step: 'confirming', scope: 'account' })
                }
              />
            </SettingsSection>

            {confirmationCopy ? (
              <View style={styles.warningCard}>
                <Text tone="expense" variant="bodyStrong" weight="semibold">
                  {confirmationCopy.title}
                </Text>
                <Text tone="secondary" variant="label">
                  {confirmationCopy.body}
                </Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, confirmProgressStyle]}
                  />
                </View>
                <View style={styles.actionsRow}>
                  <ModalPrimaryAction
                    accessibilityLabel="Cancelar eliminación"
                    label="Cancelar"
                    onPress={() => setDeletion({ step: 'idle' })}
                    style={styles.actionButton}
                    variant="surface"
                  />
                  <ModalPrimaryAction
                    accessibilityLabel={
                      secondsRemaining > 0
                        ? `Espera ${secondsRemaining} segundos para confirmar la eliminación`
                        : confirmationCopy.confirmLabel
                    }
                    disabled={secondsRemaining > 0}
                    label={
                      secondsRemaining > 0
                        ? `Espera (${secondsRemaining})`
                        : confirmationCopy.confirmLabel
                    }
                    onPress={handleConfirmDeletion}
                    style={[styles.actionButton, styles.destructiveButton]}
                    testID={confirmationCopy.testID}
                    variant="cta"
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {deletion.step === 'deleting' ? (
          <View style={styles.body}>
            <Text variant="body">Eliminando tus datos…</Text>
          </View>
        ) : null}

        {deletion.step === 'done' ? (
          <View style={styles.body}>
            <Text variant="bodyStrong" weight="semibold">
              {deletion.scope === 'account'
                ? 'Tu cuenta y tus datos se eliminaron.'
                : deletion.scope === 'data'
                  ? 'Tus datos se eliminaron. Tu cuenta sigue activa.'
                  : 'Tus datos locales se eliminaron.'}
            </Text>
            <Text tone="secondary" variant="label">
              Cierra y vuelve a abrir Juntos para completar el proceso.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Cerrar"
              label="Cerrar"
              onPress={handleClose}
              variant="cta"
            />
          </View>
        ) : null}

        {deletion.step === 'error' ? (
          <View style={styles.body}>
            <Text tone="expense" variant="body">
              {deletion.message}
            </Text>
            {deletion.detail ? (
              <Text tone="secondary" variant="label">
                {deletion.detail}
              </Text>
            ) : null}
            <ModalPrimaryAction
              accessibilityLabel="Volver a intentar"
              label="Volver a intentar"
              onPress={() =>
                setDeletion({ step: 'confirming', scope: deletion.scope })
              }
              variant="surface"
            />
          </View>
        ) : null}
      </View>
    </AppModal>
  );
}
