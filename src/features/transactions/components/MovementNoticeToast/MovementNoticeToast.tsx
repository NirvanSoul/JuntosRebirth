import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { NoticeToast } from '@/components/overlays/NoticeToast/NoticeToast';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { MovementNotice } from '@/features/transactions/hooks/useMovementNotice';
import { categoryColors } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { useTheme } from '@/theme/useTheme';

type MovementNoticeToastProps = {
  notice: MovementNotice | null;
  onDismiss: (noticeId: number) => void;
  testID?: string;
};

const categoryBadgeSize = 32;

/**
 * Confirmación de movimientos creados o copiados entre espacios. Si el aviso
 * trae categoría o cuenta, la tarjeta muestra a la izquierda su icono.
 */
export function MovementNoticeToast({
  notice,
  onDismiss,
  testID,
}: MovementNoticeToastProps) {
  const { colors } = useTheme();
  // Memorizado: un aviso nuevo en cada render reiniciaría su temporizador.
  const toastNotice = useMemo(() => {
    const iconSource = notice?.category ?? notice?.moneyAccount;
    if (!notice || !iconSource) return notice;

    return {
      ...notice,
      leading: (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColors[iconSource.colorToken] },
          ]}
          testID={
            notice.category
              ? 'movement-notice-category-icon'
              : 'movement-notice-money-account-icon'
          }
        >
          {notice.category ? (
            <CategoryIcon
              color={colors.onBrand}
              name={notice.category.icon}
              size={iconSize.sm}
            />
          ) : notice.moneyAccount ? (
            <MoneyAccountIcon
              color={colors.onBrand}
              name={notice.moneyAccount.icon}
              size={iconSize.sm}
            />
          ) : null}
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
