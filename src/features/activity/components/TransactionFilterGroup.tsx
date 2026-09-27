import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, type PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import {
  AnimatedChevron,
  AnimatedDisclosureContent,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import { iconSize, layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type TransactionFilterGroupProps = PropsWithChildren<{
  expanded: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
  onToggle: () => void;
  title: string;
}>;

export function TransactionFilterGroup({
  children,
  expanded,
  icon,
  iconTestID,
  onToggle,
  title,
}: TransactionFilterGroupProps) {
  const { colors } = useTheme();

  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      style={styles.filterGroup}
    >
      <Pressable
        accessibilityHint={`${expanded ? 'Oculta' : 'Muestra'} las opciones de ${title.toLowerCase()}`}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={spacing.sm}
        onPress={onToggle}
        style={({ pressed }) => [styles.groupHeader, pressed && styles.pressed]}
      >
        <View style={styles.groupTitle}>
          <Ionicons
            color={colors.textSecondary}
            name={icon}
            size={iconSize.xs}
            testID={iconTestID}
          />
          <Text variant="label">{title}</Text>
        </View>
        <AnimatedChevron expanded={expanded} />
      </Pressable>
      <AnimatedDisclosureContent expanded={expanded}>
        <View style={styles.groupContent}>{children}</View>
      </AnimatedDisclosureContent>
    </Animated.View>
  );
}

const styles = {
  filterGroup: { paddingBottom: spacing.md },
  groupHeader: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  groupTitle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  groupContent: { marginTop: spacing.sm },
  pressed: { opacity: 0.64 },
};
