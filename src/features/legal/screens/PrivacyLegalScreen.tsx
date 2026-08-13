import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from '@/components/layout/SettingsList/SettingsList';
import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import { privacyPolicy } from '@/features/legal/content/privacyPolicy';
import { LegalDocumentScreen } from '@/features/legal/screens/LegalDocumentScreen';
import type { LegalDocumentId } from '@/features/legal/model/types';
import { categoryColors } from '@/theme/categoryColors';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PrivacyLegalScreenProps = {
  onClose: () => void;
  visible: boolean;
};

export function PrivacyLegalScreen({
  onClose,
  visible,
}: PrivacyLegalScreenProps) {
  const styles = useThemedStyles(() =>
    StyleSheet.create({
      container: { flex: 1, gap: spacing.lg },
      header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
      },
      headerText: { flex: 1, gap: spacing.xs },
      scrollContent: { gap: spacing.lg, paddingBottom: spacing.xl },
    }),
  );
  const [openDocumentId, setOpenDocumentId] = useState<LegalDocumentId | null>(
    null,
  );

  const closeDocument = () => setOpenDocumentId(null);

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      testID="privacy-legal-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Documentos legales
            </Text>
            <Text tone="secondary" variant="label">
              Consulta la política de privacidad, los términos de servicio y las
              licencias de Juntos.
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SettingsSection icon="reader-outline" title="Documentos">
            <SettingsRow
              icon="document-text-outline"
              iconBackgroundColor={categoryColors.violet}
              label="Política de privacidad"
              onPress={() => setOpenDocumentId('privacy-policy')}
            />
            <SettingsDivider />
            <SettingsRow
              icon="receipt-outline"
              iconBackgroundColor={categoryColors.amber}
              label="Términos de servicio"
              onPress={() => setOpenDocumentId('terms-of-service')}
            />
            <SettingsDivider />
            <SettingsRow
              icon="code-slash-outline"
              iconBackgroundColor={categoryColors.blue}
              label="Licencias de código abierto"
              onPress={() => setOpenDocumentId('open-source-licenses')}
            />
          </SettingsSection>

          <SettingsSection
            icon="information-circle-outline"
            title="Información"
          >
            <SettingsRow
              icon="calendar-outline"
              iconBackgroundColor={categoryColors.green}
              label="Última actualización"
              value={privacyPolicy.lastUpdated}
            />
            <SettingsDivider />
            <SettingsRow
              icon="pricetag-outline"
              iconBackgroundColor={categoryColors.blue}
              label="Versión del documento"
              value={privacyPolicy.version}
            />
          </SettingsSection>
        </BottomSheetScrollView>
      </View>

      <LegalDocumentScreen
        documentId={openDocumentId ?? 'privacy-policy'}
        onClose={closeDocument}
        visible={openDocumentId !== null}
      />
    </AppModal>
  );
}
