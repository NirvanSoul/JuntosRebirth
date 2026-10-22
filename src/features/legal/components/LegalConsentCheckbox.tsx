import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { LegalDocumentId } from '@/features/legal/model/types';
import { LegalDocumentScreen } from '@/features/legal/screens/LegalDocumentScreen';
import { iconSize, layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type LegalConsentCheckboxProps = {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  testID?: string;
};

/**
 * Casilla de aceptación de Términos y Política de privacidad. Cada documento
 * se abre dentro de la app para que pueda leerse antes de aceptarlo.
 */
export function LegalConsentCheckbox({
  accepted,
  onChange,
  testID = 'legal-consent',
}: LegalConsentCheckboxProps) {
  const { colors } = useTheme();
  const [openDocument, setOpenDocument] = useState<Exclude<
    LegalDocumentId,
    'open-source-licenses'
  > | null>(null);
  const toggle = () => onChange(!accepted);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Acepto los Términos de servicio y la Política de privacidad"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        hitSlop={spacing.sm}
        onPress={toggle}
        style={styles.box}
        testID={`${testID}-checkbox`}
      >
        <Ionicons
          color={accepted ? colors.cta : colors.textMuted}
          name={accepted ? 'checkbox' : 'square-outline'}
          size={iconSize.md}
        />
      </Pressable>
      <Text
        onPress={toggle}
        style={styles.label}
        tone="secondary"
        variant="footnote"
      >
        Acepto los{' '}
        <Text
          accessibilityRole="link"
          onPress={() => setOpenDocument('terms-of-service')}
          testID={`${testID}-terms`}
          tone="cta"
          variant="footnote"
          weight="semibold"
        >
          Términos de servicio
        </Text>{' '}
        y la{' '}
        <Text
          accessibilityRole="link"
          onPress={() => setOpenDocument('privacy-policy')}
          testID={`${testID}-privacy`}
          tone="cta"
          variant="footnote"
          weight="semibold"
        >
          Política de privacidad
        </Text>
        .
      </Text>
      <LegalDocumentScreen
        documentId={openDocument ?? 'terms-of-service'}
        onClose={() => setOpenDocument(null)}
        visible={openDocument !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
