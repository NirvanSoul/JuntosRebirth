import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import type { UpcomingFeature } from '@/features/comingSoon/upcomingFeatures';
import { UpcomingFeatureIcon } from '@/features/comingSoon/UpcomingFeatureIcon';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';

const feedbackEmail = 'aora.estudio.o@gmail.com';

export async function openFeatureFeedback(name: string) {
  const subject = encodeURIComponent(`Ideas para Juntos: ${name}`);
  const body = encodeURIComponent(
    `Hola, equipo:\n\nSobre ${name}, me gustaría…\n\nTambién propongo…\n`,
  );
  try {
    await Linking.openURL(
      `mailto:${feedbackEmail}?subject=${subject}&body=${body}`,
    );
  } catch {
    Alert.alert(
      'No pudimos abrir tu correo',
      `Puedes enviarnos tus ideas a ${feedbackEmail}.`,
    );
  }
}

export function UpcomingFeatureModal({
  feature,
  visible,
  onClose,
}: {
  feature: UpcomingFeature | null;
  visible: boolean;
  onClose: () => void;
}) {
  const bottomInset = useAppModalBottomInset();
  const { colors } = useTheme();
  return (
    <AppModal
      containsScrollable
      extendContentIntoBottomInset
      onClose={onClose}
      visible={visible}
      testID="upcoming-feature-modal"
    >
      {feature ? (
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomInset },
          ]}
        >
          <View style={styles.header}>
            <UpcomingFeatureIcon feature={feature} />
            <View style={styles.title}>
              <Text accessibilityRole="header" variant="heading">
                {feature.name}
              </Text>
              <Text tone="secondary" variant="caption">
                Próximamente
              </Text>
            </View>
            <ModalCloseButton onPress={onClose} />
          </View>
          <View style={styles.explanation}>
            <Text variant="body" weight="medium">
              {feature.description}
            </Text>
            <Text tone="secondary" variant="body">
              {feature.details}
            </Text>
          </View>
          <View style={[styles.feedback, { borderTopColor: colors.border }]}>
            <Text variant="label" weight="semibold">
              Ayúdanos a darle forma
            </Text>
            <Text tone="secondary" variant="footnote">
              Esta es nuestra idea inicial. ¿Cómo la usarías tú? Cuéntanos qué
              añadirías o qué harías diferente.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel={`Enviar ideas por correo sobre ${feature.name}`}
              icon="mail-outline"
              label="Compartir mi idea"
              onPress={() => {
                void openFeatureFeedback(feature.name);
              }}
              variant="surface"
            />
          </View>
        </BottomSheetScrollView>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, gap: spacing.xs },
  explanation: { gap: spacing.lg },
  feedback: {
    gap: spacing.md,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
