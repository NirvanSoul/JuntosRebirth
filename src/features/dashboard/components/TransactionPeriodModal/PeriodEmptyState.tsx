import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import type { TransactionPeriodModalType } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal';
import { createStyles } from '@/features/dashboard/components/TransactionPeriodModal/TransactionPeriodModal.styles';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const typeLabels = {
  income: 'ingresos',
  expense: 'gastos',
  balance: 'movimientos',
} as const;

const typeIcons = {
  income: 'arrow-up',
  expense: 'arrow-down',
  balance: 'swap-vertical-outline',
} as const;

/** Aviso del periodo sin movimientos del tipo de la hoja. */
export function PeriodEmptyState({
  accentColor,
  type,
}: {
  accentColor: string;
  type: TransactionPeriodModalType;
}) {
  const { shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <View style={styles.empty}>
      <Ionicons
        color={accentColor}
        name={typeIcons[type]}
        size={iconSize.lg}
        style={styles.diagonalArrow}
      />
      <Text align="center" tone="secondary" variant="footnote">
        No hay {typeLabels[type]} efectivos en este periodo.
      </Text>
    </View>
  );
}
