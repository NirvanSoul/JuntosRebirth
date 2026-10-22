import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { NoticeToast } from '@/components/overlays/NoticeToast/NoticeToast';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { CopyNotice } from '@/features/spaces/hooks/useCopyToSpace';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { useTheme } from '@/theme/useTheme';

type CopyNoticeToastProps = {
  notice: CopyNotice | null;
  onDismiss: (noticeId: number) => void;
  testID?: string;
};

const categoryBadgeSize = 32;

/**
 * Confirmación de copia entre espacios. Si lo copiado es un movimiento, la
 * tarjeta muestra a la izquierda el icono de su categoría.
 */
export function CopyNoticeToast({
  notice,
  onDismiss,
  testID,
}: CopyNoticeToastProps) {
  const { colors } = useTheme();
  // Memorizado: un aviso nuevo en cada render reiniciaría su temporizador.
  const toastNotice = useMemo(() => {
    const category = notice?.category;
    if (!notice || !category) return notice;

    return {
      ...notice,
      leading: (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColors[category.colorToken] },
          ]}
          testID="copy-notice-category-icon"
        >
          <CategoryIcon
            color={colors.onBrand}
            name={category.icon}
            size={iconSize.sm}
          />
        </View>
      ),
    };
  }, [colors.onBrand, notice]);

  return (
    <NoticeToast notice={toastNotice} onDismiss={onDismiss} testID={testID} />
  );
}

const styles = StyleSheet.create({
  categoryBadge: {
    width: categoryBadgeSize,
    height: categoryBadgeSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
});
