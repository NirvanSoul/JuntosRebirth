import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { LegalAcceptanceStep } from '@/features/legal/components/LegalAcceptanceStep/LegalAcceptanceStep';
import type {
  LegalAcceptanceDocumentId,
  LegalDecision,
} from '@/features/legal/model/types';
import { isLegalDecisionComplete } from '@/features/legal/model/types';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const perDocumentValidationMessages: Record<LegalAcceptanceDocumentId, string> =
  {
    'terms-of-service': 'Acepta los Términos de servicio para continuar.',
    'privacy-policy':
      'Confirma que has podido consultar la Política de privacidad para continuar.',
  };

/** La validación exige exactamente los documentos pendientes, ni más ni menos. */
function buildValidationMessage(
  missingDocuments: readonly LegalAcceptanceDocumentId[],
): string {
  if (missingDocuments.length === 0) {
    return 'Confirma tu aceptación legal para continuar.';
  }
  if (missingDocuments.length === 2) {
    return 'Acepta los Términos y confirma que has podido consultar la Política para continuar.';
  }
  return missingDocuments
    .map((documentId) => perDocumentValidationMessages[documentId])
    .join(' ');
}

type LegalSessionGateScreenProps = {
  error: string | null;
  missingDocuments: LegalAcceptanceDocumentId[];
  onAbandon: () => void;
  onRetry: () => void;
  onSubmit: (decision: LegalDecision) => Promise<void>;
  /**
   * Mientras la puerta comprueba, la superficie queda bloqueada con un
   * indicador (B5): los efectos no pueden disparar y la persona ve que la
   * verificación está en curso. En `required` se muestra el paso de acción.
   */
  variant: 'checking' | 'required';
};

/**
 * Puerta legal obligatoria para toda sesión autenticada sin evidencia de las
 * versiones vigentes. No puede cerrarse (no existe botón para omitir): exige
 * únicamente los documentos pendientes (B4), permite reintentar un fallo
 * observable o cerrar solo la sesión local.
 */
export function LegalSessionGateScreen({
  error,
  missingDocuments,
  onAbandon,
  onRetry,
  onSubmit,
  variant,
}: LegalSessionGateScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  // B4: un nuevo episodio (cambian los documentos pendientes) resetea la
  // decisión y la entrega anteriores: la Política marcada en un episodio no
  // puede contar como aceptación de Términos en el siguiente. Se ajusta
  // durante el render (patrón de estado derivado de props), sin efectos.
  const episodeKey = missingDocuments.join('|');
  const [previousEpisodeKey, setPreviousEpisodeKey] = useState(episodeKey);
  const [decision, setDecision] = useState<LegalDecision>({
    acceptedTerms: false,
    consultedPrivacy: false,
  });
  const [isSubmitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (previousEpisodeKey !== episodeKey) {
    setPreviousEpisodeKey(episodeKey);
    setDecision({ acceptedTerms: false, consultedPrivacy: false });
    setSubmitting(false);
    setLocalError(null);
  }

  const handleSubmit = async () => {
    if (isSubmitting || variant === 'checking') return;
    if (!isLegalDecisionComplete(missingDocuments, decision)) {
      setLocalError(buildValidationMessage(missingDocuments));
      return;
    }
    setLocalError(null);
    setSubmitting(true);
    try {
      await onSubmit(decision);
    } catch (caught) {
      setSubmitting(false);
      setLocalError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos registrar tu aceptación.',
      );
    }
  };

  const visibleError = localError ?? error;
  const isBlocked = isSubmitting || variant === 'checking';

  return (
    <AppModal
      allowManualDismiss={false}
      containsScrollable
      hideHandle
      onClose={() => undefined}
      testID="legal-gate-screen"
      variant="expanded"
      visible
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" variant="heading">
          {variant === 'checking'
            ? 'Comprobando tu confirmación legal'
            : 'Tu confirmación legal'}
        </Text>
        <Text tone="secondary" variant="body">
          {variant === 'checking'
            ? 'Estamos verificando que tus documentos vigentes consten registrados.'
            : 'Para usar tu cuenta necesitamos tu confirmación de los documentos vigentes. Puedes leerlos antes de continuar.'}
        </Text>

        {variant === 'checking' ? (
          <View style={styles.checkingBody}>
            <ActivityIndicator
              color={colors.brand}
              testID="legal-gate-checking"
            />
          </View>
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <LegalAcceptanceStep
              disabled={isBlocked}
              error={visibleError}
              onChange={setDecision}
              requiredDocuments={missingDocuments}
              testIDPrefix="legal-gate"
              value={decision}
            />

            <ModalPrimaryAction
              accessibilityLabel="Confirmar y continuar"
              disabled={isBlocked}
              label={isSubmitting ? 'Confirmando…' : 'Confirmar y continuar'}
              onPress={() => void handleSubmit()}
              testID="legal-gate-submit"
              variant="cta"
            />

            <View style={styles.secondaryActions}>
              <ModalPrimaryAction
                accessibilityLabel="Reintentar comprobación"
                disabled={isBlocked}
                label="Reintentar"
                onPress={onRetry}
                testID="legal-gate-retry"
                variant="surface"
              />
              <ModalPrimaryAction
                accessibilityLabel="Cerrar sesión y volver al acceso"
                disabled={isBlocked}
                label="Cerrar sesión"
                onPress={onAbandon}
                testID="legal-gate-sign-out"
                variant="surface"
              />
            </View>
          </BottomSheetScrollView>
        )}
      </View>
    </AppModal>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.lg },
    scrollContent: { gap: spacing.lg, paddingBottom: spacing.xl },
    secondaryActions: { gap: spacing.md },
    checkingBody: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.huge,
    },
  });
}
