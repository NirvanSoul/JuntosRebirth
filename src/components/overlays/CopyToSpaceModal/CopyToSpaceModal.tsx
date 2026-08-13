import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type CopyTarget = {
  id: string;
  name: string;
};

type CopyToSpaceModalProps = {
  description: string;
  failureMessage: (target: CopyTarget) => string;
  itemName: string;
  onClose: () => void;
  onSelect: (targetSpaceId: string) => boolean | Promise<boolean>;
  targets: readonly CopyTarget[];
  testID: string;
  visible: boolean;
};

const spaceRowHeight = 56;

export function CopyToSpaceModal({
  description,
  failureMessage,
  itemName,
  onClose,
  onSelect,
  targets,
  testID,
  visible,
}: CopyToSpaceModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const contentHeight = useMemo(
    () =>
      layout.minTouchTarget +
      spacing.sm +
      44 +
      spacing.lg +
      targets.length * spaceRowHeight +
      Math.max(targets.length - 1, 0) * spacing.sm,
    [targets.length],
  );

  useEffect(() => {
    if (visible) {
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  return (
    <AppModal
      containsScrollable
      contentHeight={contentHeight}
      onClose={onClose}
      stackBehavior="push"
      testID={testID}
      variant="catalog"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" variant="heading">
              Copiar a otro espacio
            </Text>
            <Text numberOfLines={1} tone="secondary" variant="footnote">
              {itemName}
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>
        <Text tone="secondary" variant="footnote">
          {description}
        </Text>
        <BottomSheetScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {targets.map((target) => (
            <Pressable
              accessibilityLabel={`Copiar a ${target.name}`}
              accessibilityRole="button"
              key={target.id}
              disabled={isSaving}
              onPress={() => {
                setSaving(true);
                void Promise.resolve()
                  .then(() => onSelect(target.id))
                  .then((succeeded) => {
                    if (succeeded) {
                      onClose();
                      return;
                    }
                    setError(failureMessage(target));
                  })
                  .catch(() => setError(failureMessage(target)))
                  .finally(() => setSaving(false));
              }}
              style={({ pressed }) => [
                styles.spaceRow,
                (pressed || isSaving) && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.textSecondary}
                name="layers-outline"
                size={iconSize.md}
              />
              <Text numberOfLines={1} style={styles.spaceName} variant="label">
                {target.name}
              </Text>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={iconSize.sm}
              />
            </Pressable>
          ))}
        </BottomSheetScrollView>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            tone="expense"
            variant="footnote"
          >
            {error}
          </Text>
        ) : null}
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.md },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerCopy: { flex: 1, gap: spacing.xxs },
    list: { gap: spacing.sm, marginTop: spacing.xs },
    spaceRow: {
      height: spaceRowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.background,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
    },
    spaceName: { flex: 1 },
    pressed: { opacity: 0.64 },
  });
}
