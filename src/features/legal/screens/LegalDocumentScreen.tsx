import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import { privacyPolicy } from '@/features/legal/content/privacyPolicy';
import { termsOfService } from '@/features/legal/content/termsOfService';
import type { LegalDocumentId } from '@/features/legal/model/types';
import { openSourceLicenses } from '@/features/legal/services/legalDocumentService';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type LegalDocumentScreenProps = {
  documentId: LegalDocumentId;
  onClose: () => void;
  visible: boolean;
};

const documentTitles: Record<LegalDocumentId, string> = {
  'privacy-policy': privacyPolicy.title,
  'terms-of-service': termsOfService.title,
  'open-source-licenses': 'Licencias de código abierto',
};

function LicensesList() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.body}>
      <Text tone="secondary" variant="label">
        Tecnologías de código abierto usadas en Juntos y su licencia.
      </Text>
      {openSourceLicenses.map((entry) => (
        <View key={`${entry.name}@${entry.version}`} style={styles.licenseRow}>
          <Text variant="label" weight="semibold">
            {entry.name}
          </Text>
          <Text tone="secondary" variant="footnote">
            {entry.version} · {entry.license}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DocumentBody({ documentId }: { documentId: LegalDocumentId }) {
  const styles = useThemedStyles(createStyles);

  if (documentId === 'open-source-licenses') {
    return <LicensesList />;
  }

  const content =
    documentId === 'privacy-policy' ? privacyPolicy : termsOfService;

  return (
    <View style={styles.body}>
      <Text tone="secondary" variant="footnote">
        Versión {content.version} · Vigente desde {content.effectiveDate} ·
        Última actualización {content.lastUpdated}
      </Text>
      {content.intro.map((paragraph, index) => (
        <Text key={`intro-${index}`} variant="body">
          {paragraph}
        </Text>
      ))}
      {content.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="bodyStrong" weight="semibold">
            {section.heading}
          </Text>
          {section.body.map((paragraph, index) => (
            <Text key={index} tone="secondary" variant="label">
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function LegalDocumentScreen({
  documentId,
  onClose,
  visible,
}: LegalDocumentScreenProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="legal-document-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={styles.headerText}
            variant="heading"
          >
            {documentTitles[documentId]}
          </Text>
          <ModalCloseButton onPress={onClose} />
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DocumentBody documentId={documentId} />
        </BottomSheetScrollView>
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerText: { flex: 1 },
    scrollContent: { paddingBottom: spacing.xl },
    body: { gap: spacing.md },
    section: { gap: spacing.xs, marginTop: spacing.md },
    licenseRow: {
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      borderBottomColor: colors.categoryPreviewBorder,
      borderBottomWidth: 1,
    },
  });
}
