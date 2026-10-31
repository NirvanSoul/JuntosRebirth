import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { TransactionFilterGroup } from '@/features/activity/components/TransactionFilterGroup';
import { spacing } from '@/theme/spacing';

type ChoiceFilterGroupProps<T extends string> = {
  expanded: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  options: readonly { label: string; value: T }[];
  onSelect: (value: T) => void;
  onToggle: () => void;
  selected: T;
  prefix: string;
  title: string;
};

export function TransactionChoiceFilterGroup<T extends string>({
  expanded,
  icon,
  options,
  onSelect,
  onToggle,
  selected,
  prefix,
  title,
}: ChoiceFilterGroupProps<T>) {
  return (
    <TransactionFilterGroup
      expanded={expanded}
      icon={icon}
      iconTestID={`${prefix}-filter-group-icon`}
      onToggle={onToggle}
      title={title}
    >
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => (
          <SelectableOption
            accessibilityLabel={`${title}: ${option.label}`}
            indicatorTestID={`${prefix}-filter-${option.value}-indicator`}
            indicator={false}
            key={option.value}
            label={option.label}
            onPress={() => onSelect(option.value)}
            selected={selected === option.value}
            style={styles.option}
            testID={`${prefix}-filter-${option.value}`}
          />
        ))}
      </View>
    </TransactionFilterGroup>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { flexGrow: 1, gap: spacing.xs, paddingHorizontal: spacing.sm },
});
