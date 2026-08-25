import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import { useSpaceMembership } from '@/features/profile/state/SpaceMembershipContext';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type CategoryAuthorFilterValue = 'all' | 'own' | 'partner';

type CategoryAuthorFilterProps = {
  onChange: (value: CategoryAuthorFilterValue) => void;
  value: CategoryAuthorFilterValue;
};

const labels: Readonly<Record<CategoryAuthorFilterValue, string>> = {
  all: 'Ambos',
  own: 'Yo',
  partner: 'Pareja',
};

/** Filtro local de los movimientos de una categoría dentro de un espacio compartido. */
export function CategoryAuthorFilter({
  onChange,
  value,
}: CategoryAuthorFilterProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const membership = useSpaceMembership();
  const [isPickerVisible, setPickerVisible] = useState(false);
  const partnerName = useMemo(
    () =>
      Object.values(membership.profilesByUserId).find(
        (profile) => profile.userId !== membership.ownUserId,
      )?.displayName ?? labels.partner,
    [membership.ownUserId, membership.profilesByUserId],
  );

  if (!membership.isSharedSpace) return null;

  const options: readonly {
    label: string;
    value: CategoryAuthorFilterValue;
  }[] = [
    { label: labels.all, value: 'all' },
    { label: labels.own, value: 'own' },
    { label: partnerName, value: 'partner' },
  ];
  const selectedLabel = value === 'partner' ? partnerName : labels[value];

  return (
    <>
      <Pressable
        accessibilityHint="Abre las opciones para filtrar los movimientos por autor"
        accessibilityLabel={`Autor: ${selectedLabel}`}
        accessibilityRole="button"
        onPress={() => setPickerVisible(true)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID="category-detail-author-filter"
      >
        <Text variant="label">Autor</Text>
        <View style={styles.value}>
          <Text tone="secondary" variant="label">
            {selectedLabel}
          </Text>
          <Ionicons
            color={colors.textMuted}
            name="chevron-forward"
            size={iconSize.sm}
          />
        </View>
      </Pressable>
      <AppModal
        onClose={() => setPickerVisible(false)}
        stackBehavior="push"
        testID="category-author-filter-modal"
        visible={isPickerVisible}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={styles.headerText}
              variant="heading"
            >
              Filtrar por autor
            </Text>
            <ModalCloseButton onPress={() => setPickerVisible(false)} />
          </View>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {options.map((option) => (
              <SelectableOption
                accessibilityLabel={option.label}
                key={option.value}
                label={option.label}
                onPress={() => {
                  onChange(option.value);
                  setPickerVisible(false);
                }}
                selected={value === option.value}
                testID={`category-author-filter-${option.value}`}
              />
            ))}
          </View>
        </View>
      </AppModal>
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    value: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
    pressed: { opacity: 0.64 },
    modalContent: { gap: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    headerText: { flex: 1 },
    options: { gap: spacing.sm },
  });
}
