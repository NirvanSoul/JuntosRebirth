import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { LegalDocumentScreen } from '@/features/legal/screens/LegalDocumentScreen';
import type {
  LegalAcceptanceDocumentId,
  LegalDecision,
} from '@/features/legal/model/types';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type LegalAcceptanceStepProps = {
  disabled?: boolean;
  error?: string | null;
  onChange: (decision: LegalDecision) => void;
  /**
   * Documentos que exigen acción en este paso. B4: la puerta legal pasa
   * únicamente los pendientes de versión vigente y no vuelve a pedir lo que ya
   * consta. El registro (SignUpScreen) exige siempre los dos por defecto.
   */
  requiredDocuments?: readonly LegalAcceptanceDocumentId[];
  testIDPrefix?: string;
  value: LegalDecision;
};

type OpenDocument = 'terms-of-service' | 'privacy-policy' | null;

const toggleIconSize = layout.minTouchTarget / 2;

/**
 * Las dos acciones legales diferenciadas: aceptar los Términos es un acto
 * contractual y confirmar la consulta de la Política de privacidad no se
 * presenta como «consentimiento» genérico. Ambos documentos se abren con
 * `LegalDocumentScreen` sin perder el estado del formulario que la aloja.
 */
export function LegalAcceptanceStep({
  disabled = false,
  error,
  onChange,
  requiredDocuments = ['terms-of-service', 'privacy-policy'],
  testIDPrefix = 'legal-step',
  value,
}: LegalAcceptanceStepProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [openDocument, setOpenDocument] = useState<OpenDocument>(null);

  const termsRequired = requiredDocuments.includes('terms-of-service');
  const privacyRequired = requiredDocuments.includes('privacy-policy');
  const showsPartialSet = !(termsRequired && privacyRequired);

  return (
    <View style={styles.container}>
      <Text tone="secondary" variant="label">
        {showsPartialSet
          ? 'Confirma los documentos de versión vigente que te faltan.'
          : 'Antes de continuar necesitamos tu confirmación legal.'}
      </Text>

      <View style={styles.actions}>
        {termsRequired ? (
          <Pressable
            accessibilityLabel="Acepto los Términos de servicio"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: value.acceptedTerms, disabled }}
            disabled={disabled}
            onPress={() =>
              onChange({ ...value, acceptedTerms: !value.acceptedTerms })
            }
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
            testID={`${testIDPrefix}-terms-toggle`}
          >
            <Ionicons
              color={value.acceptedTerms ? colors.cta : colors.textMuted}
              name={value.acceptedTerms ? 'checkbox' : 'square-outline'}
              size={toggleIconSize}
            />
            <Text style={styles.actionText} variant="body">
              Acepto los Términos de servicio
            </Text>
            <Pressable
              accessibilityLabel="Leer Términos de servicio"
              accessibilityRole="link"
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={spacing.sm}
              onPress={() => setOpenDocument('terms-of-service')}
              style={styles.readButton}
              testID={`${testIDPrefix}-open-terms`}
            >
              <Text tone="brand" variant="footnote">
                Leer
              </Text>
            </Pressable>
          </Pressable>
        ) : null}

        {privacyRequired ? (
          <Pressable
            accessibilityLabel="Confirmo que he podido consultar la Política de privacidad"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: value.consultedPrivacy, disabled }}
            disabled={disabled}
            onPress={() =>
              onChange({ ...value, consultedPrivacy: !value.consultedPrivacy })
            }
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
            testID={`${testIDPrefix}-privacy-toggle`}
          >
            <Ionicons
              color={value.consultedPrivacy ? colors.cta : colors.textMuted}
              name={value.consultedPrivacy ? 'checkbox' : 'square-outline'}
              size={toggleIconSize}
            />
            <Text style={styles.actionText} variant="body">
              Confirmo que he podido consultar la Política de privacidad
            </Text>
            <Pressable
              accessibilityLabel="Leer Política de privacidad"
              accessibilityRole="link"
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={spacing.sm}
              onPress={() => setOpenDocument('privacy-policy')}
              style={styles.readButton}
              testID={`${testIDPrefix}-open-privacy`}
            >
              <Text tone="brand" variant="footnote">
                Leer
              </Text>
            </Pressable>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text tone="expense" variant="footnote">
          {error}
        </Text>
      ) : null}

      <LegalDocumentScreen
        documentId={
          openDocument === 'privacy-policy'
            ? 'privacy-policy'
            : 'terms-of-service'
        }
        onClose={() => setOpenDocument(null)}
        visible={openDocument !== null}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { gap: spacing.md },
    actions: { gap: spacing.md },
    actionRow: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.md,
    },
    actionRowPressed: { opacity: 0.72 },
    actionText: { flex: 1 },
    readButton: {
      minHeight: layout.minTouchTarget,
      justifyContent: 'center',
    },
  });
}
