import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type HomeSectionHeaderProps = {
  onViewMore?: () => void;
  title: string;
};

/** Encabezado de sección de Inicio con su enlace «Ver más» opcional. */
export function HomeSectionHeader({
  onViewMore,
  title,
}: HomeSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" variant="subheading">
        {title}
      </Text>
      <Pressable
        accessibilityLabel={`Ver más de ${title}`}
        accessibilityRole="button"
        disabled={!onViewMore}
        onPress={onViewMore}
        style={({ pressed }) => [
          styles.sectionLink,
          pressed && styles.sectionLinkPressed,
        ]}
      >
        <Text tone="secondary" variant="footnote" weight="light">
          Ver más
        </Text>
      </Pressable>
    </View>
  );
}

type HomeTransactionListFooterProps = {
  onPress?: () => void;
};

export function HomeTransactionListFooter({
  onPress,
}: HomeTransactionListFooterProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel="Ver más movimientos en Actividad"
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transactionListFooter,
        pressed ? styles.sectionLinkPressed : null,
      ]}
      testID="home-transactions-view-more"
    >
      <Text tone="secondary" variant="footnote" weight="semibold">
        Ver más movimientos
      </Text>
      <Ionicons
        color={colors.textSecondary}
        name="chevron-forward"
        size={iconSize.xs}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  sectionLink: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
  },
  sectionLinkPressed: {
    opacity: 0.64,
  },
  transactionListFooter: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
