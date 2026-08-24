import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { LegalAcceptanceStep } from '@/features/legal/components/LegalAcceptanceStep/LegalAcceptanceStep';
import type {
  LegalAcceptanceDocumentId,
  LegalDecision,
} from '@/features/legal/model/types';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

const validationMessage =
  'Acepta los Términos y confirma que has podido consultar la Política para continuar.';

type LegalSessionGateScreenProps = {
  error: string | null;
  missingDocuments: LegalAcceptanceDocumentId[];
  onAbandon: () => void;
  onRetry: () => void;
  onSubmit: (decision: LegalDecision) => Promise<void>;
};

/**
 * Puerta legal obligatoria para toda sesión autenticada sin evidencia de las
 * versiones vigentes. No puede cerrarse (no existe botón para omitir): permite
 * completar las dos acciones, reintentar un fallo observable o cerrar solo la
 * sesión local.
 */
export function LegalSessionGateScreen({
  error,
  onAbandon,
  onRetry,
  onSubmit,
}: LegalSessionGateScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [decision, setDecision] = useState<LegalDecision>({
    acceptedTerms: false,
    consultedPrivacy: false,
  });
  const [isSubmitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!decision.acceptedTerms || !decision.consultedPrivacy) {
      setLocalError(validationMessage);
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
          Tu confirmación legal
        </Text>
        <Text tone="secondary" variant="body">
          Para usar tu cuenta necesitamos tu confirmación de los documentos
          vigentes. Puedes leerlos antes de continuar.
        </Text>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LegalAcceptanceStep
            disabled={isSubmitting}
            error={visibleError}
            onChange={setDecision}
            testIDPrefix="legal-gate"
            value={decision}
          />

          <ModalPrimaryAction
            accessibilityLabel="Confirmar y continuar"
            disabled={isSubmitting}
            label={isSubmitting ? 'Confirmando…' : 'Confirmar y continuar'}
            onPress={() => void handleSubmit()}
            testID="legal-gate-submit"
            variant="cta"
          />

          <View style={styles.secondaryActions}>
            <ModalPrimaryAction
              accessibilityLabel="Reintentar comprobación"
              disabled={isSubmitting}
              label="Reintentar"
              onPress={onRetry}
              testID="legal-gate-retry"
              variant="surface"
            />
            <ModalPrimaryAction
              accessibilityLabel="Cerrar sesión y volver al acceso"
              disabled={isSubmitting}
              label="Cerrar sesión"
              onPress={onAbandon}
              testID="legal-gate-sign-out"
              variant="surface"
            />
          </View>
        </BottomSheetScrollView>
      </View>
    </AppModal>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.lg },
    scrollContent: { gap: spacing.lg, paddingBottom: spacing.xl },
    secondaryActions: { gap: spacing.md },
  });
}
