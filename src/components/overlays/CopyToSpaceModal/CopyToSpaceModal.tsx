import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { iconSize, layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type CopyTarget = {
  id: string;
  name: string;
};

export type CopyItemIcon = {
  itemColor?: string;
  renderItemIcon?: CopyToSpaceRequest['renderItemIcon'];
};

/** Qué se copia y adónde; el resto de props controla la hoja. */
export type CopyToSpaceRequest = {
  failureMessage: (target: CopyTarget) => string;
  /** Fondo del icono del elemento; sin él se usa un gris neutro. */
  itemColor?: string;
  itemName: string;
  /** Glifo del elemento, pintado sobre `itemColor` como en su vista previa. */
  renderItemIcon?: (props: { color: string; size: number }) => ReactNode;
  /** Al copiar varios, sus iconos apilados y torcidos en lugar de uno. */
  stackedItems?: readonly CopyItemIcon[];
  onSelect: (targetSpaceId: string) => boolean | Promise<boolean>;
  targets: readonly CopyTarget[];
};

type CopyToSpaceModalProps = CopyToSpaceRequest & {
  onClose: () => void;
  testID: string;
  visible: boolean;
};

const spaceRowHeight = 56;
const spaceIconSize = 36;
const itemCardHeight = previewCardLayout.minHeight;
/** Iconos que caben en la pila; giros leves y distintos para que se vean sueltos. */
export const maxStackedCopyItems = 5;
const stackedTilts = [-8, 5, -3, 9, -6] as const;
const stackedOverlap = previewCardLayout.iconSize * 0.28;

export function CopyToSpaceModal({
  failureMessage,
  itemColor,
  itemName,
  onClose,
  onSelect,
  renderItemIcon,
  stackedItems,
  targets,
  testID,
  visible,
}: CopyToSpaceModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  if (useDepsChanged([visible]) && visible) {
    setError(null);
    setSaving(false);
  }
  const contentHeight = useMemo(
    () =>
      layout.minTouchTarget +
      spacing.md +
      itemCardHeight +
      spacing.lg +
      targets.length * spaceRowHeight +
      Math.max(targets.length - 1, 0) * spacing.sm +
      spacing.lg,
    [targets.length],
  );

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
          <Text
            accessibilityRole="header"
            style={styles.title}
            variant="heading"
          >
            Copiar a otro espacio
          </Text>
          <ModalCloseButton onPress={onClose} />
        </View>
        <View style={styles.itemCard} testID={`${testID}-item`}>
          {stackedItems && stackedItems.length > 1 ? (
            <View style={styles.stack} testID={`${testID}-item-stack`}>
              {stackedItems.slice(0, maxStackedCopyItems).map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.itemIcon,
                    {
                      backgroundColor: item.itemColor ?? colors.textMuted,
                      marginLeft: index === 0 ? 0 : -stackedOverlap,
                      transform: [{ rotate: `${stackedTilts[index]}deg` }],
                      zIndex: index,
                    },
                  ]}
                >
                  {renderCopyItemGlyph(item, colors.onBrand)}
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.itemIcon,
                { backgroundColor: itemColor ?? colors.textMuted },
              ]}
            >
              {renderCopyItemGlyph({ renderItemIcon }, colors.onBrand)}
            </View>
          )}
          <Text
            numberOfLines={1}
            style={styles.flexText}
            variant="label"
            weight="semibold"
          >
            {itemName}
          </Text>
        </View>
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
              <View style={styles.spaceIcon}>
                <Ionicons
                  color={colors.textPrimary}
                  name="layers-outline"
                  size={iconSize.sm}
                />
              </View>
              <Text
                numberOfLines={1}
                style={styles.flexText}
                variant="label"
                weight="semibold"
              >
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

function renderCopyItemGlyph(item: CopyItemIcon, color: string) {
  return item.renderItemIcon ? (
    item.renderItemIcon({ color, size: previewCardLayout.glyphSize })
  ) : (
    <Ionicons
      color={color}
      name="copy-outline"
      size={previewCardLayout.glyphSize}
    />
  );
}

function createStyles(colors: ColorTokens) {
  // Los espacios usan la superficie de las tarjetas de vista previa: blanca en
  // claro y gris elevado en oscuro sobre el fondo del modal.
  const card = {
    backgroundColor: colors.surface,
    borderColor: colors.categoryPreviewBorder,
    borderRadius: previewCardLayout.borderRadius,
    borderWidth: StyleSheet.hairlineWidth,
  } as const;

  return StyleSheet.create({
    container: { flex: 1, gap: spacing.md },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: { flex: 1 },
    // Sin superficie: identifica lo que se copia sin parecer un botón.
    itemCard: {
      minHeight: itemCardHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: previewCardLayout.gap,
      paddingVertical: previewCardLayout.paddingVertical,
      marginBottom: spacing.xs,
    },
    itemIcon: {
      width: previewCardLayout.iconSize,
      height: previewCardLayout.iconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: previewCardLayout.iconRadius,
    },
    stack: { flexDirection: 'row', alignItems: 'center' },
    list: { gap: spacing.sm },
    spaceRow: {
      ...card,
      height: spaceRowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingLeft: spacing.sm + spacing.xxs,
      paddingRight: spacing.md,
    },
    spaceIcon: {
      width: spaceIconSize,
      height: spaceIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.keypad,
    },
    flexText: { flex: 1 },
    pressed: { opacity: 0.64 },
  });
}
