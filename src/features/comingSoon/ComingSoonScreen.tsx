import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen/Screen';
import { Text } from '@/components/ui/Text/Text';
import { JuntosLogo } from '@/components/icons/JuntosLogo';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { UpcomingFeatureIcon } from '@/features/comingSoon/UpcomingFeatureIcon';
import {
  upcomingFeatures,
  type UpcomingFeature,
} from '@/features/comingSoon/upcomingFeatures';
import {
  UpcomingFeatureModal,
  openFeatureFeedback,
} from '@/features/comingSoon/UpcomingFeatureModal';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

const headlineLogoWidth = { compact: 132, regular: 152 };

export function ComingSoonScreen() {
  const { colors, shadows, isDark } = useTheme();
  const density = useLayoutDensity();
  const [selectedFeature, setSelectedFeature] =
    useState<UpcomingFeature | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  return (
    <Screen contentContainerStyle={styles.content} testID="coming-soon-screen">
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel="Lo que viene lo construiremos Juntos."
        style={styles.headline}
      >
        <Text align="center" variant="title" weight="bold">
          Lo que viene lo construiremos
        </Text>
        <JuntosLogo
          color={isDark ? colors.textPrimary : undefined}
          width={headlineLogoWidth[density]}
          testID="coming-soon-logo"
        />
      </View>
      <View style={[styles.grid, { gap: layout.stackGap[density] }]}>
        {upcomingFeatures.map((feature) => {
          const { name } = feature;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Descubre cómo imaginamos esta función y comparte tus ideas"
              onPress={() => {
                setSelectedFeature(feature);
                setDetailVisible(true);
              }}
              accessibilityLabel={`${name}. Próximamente`}
              key={name}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
                shadows.subtle,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <UpcomingFeatureIcon feature={feature} />
              <Text align="center" variant="label" weight="semibold">
                {name}
              </Text>
              <Text align="center" tone="secondary" variant="caption">
                Próximamente
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.feedback}>
        <Text align="center" variant="subheading" weight="semibold">
          Tu idea también cuenta
        </Text>
        <Text align="center" tone="secondary" variant="body">
          Cuéntanos qué te gustaría encontrar en la app o cómo mejorarías estas
          funciones.
        </Text>
        <ModalPrimaryAction
          accessibilityLabel="Compartir una idea por correo"
          label="Compartir mi idea"
          icon="mail-outline"
          iconColor={colors.onBrand}
          onPress={() => {
            void openFeatureFeedback('nuevas funciones');
          }}
        />
      </View>
      <UpcomingFeatureModal
        feature={selectedFeature}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.64 },
  content: { justifyContent: 'center', gap: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    flexBasis: '44%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: previewCardLayout.borderRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headline: { alignItems: 'center', gap: spacing.sm },
  feedback: { gap: spacing.md, paddingTop: spacing.sm },
});
