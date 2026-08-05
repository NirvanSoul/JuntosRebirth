import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import type { Category } from '@/features/categories/types';
import { TransactionPreviewCard } from '@/features/transactions/components/TransactionPreviewCard/TransactionPreviewCard';
import type { SessionTransaction } from '@/features/transactions/types';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

type MapDayModalProps = {
  categories: readonly Category[];
  date: string | null;
  onAddTransaction: (date: string) => void;
  onClose: () => void;
  onOpenTransactionDetail?: (transactionId: string) => void;
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

function formatSelectedDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

export function MapDayModal({
  categories,
  date,
  onAddTransaction,
  onClose,
  onOpenTransactionDetail,
  transactions,
  visible,
}: MapDayModalProps) {
  const density = useLayoutDensity();
  const bottomInset = useAppModalBottomInset();
  const floatingActionClearance =
    bottomInset + layout.actionHeight[density] + spacing.xl;
  if (!date) return null;

  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense',
  );
  const incomes = transactions.filter(
    (transaction) => transaction.type === 'income',
  );

  const renderTransactions = (entries: readonly SessionTransaction[]) => (
    <View style={styles.list}>
      {entries.map((transaction) => (
        <TransactionPreviewCard
          category={categoriesById.get(transaction.categoryId) ?? null}
          key={transaction.id}
          onPress={() => {
            onClose();
            onOpenTransactionDetail?.(transaction.id);
          }}
          transaction={transaction}
        />
      ))}
    </View>
  );

  return (
    <AppModal
      containsScrollable
      extendContentIntoBottomInset
      onClose={onClose}
      testID="map-day-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              {formatSelectedDate(date)}
            </Text>
            <Text tone="secondary" variant="footnote">
              Gastos e ingresos de este día
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: floatingActionClearance },
          ]}
          style={styles.scroll}
          testID="map-day-scroll"
        >
          {expenses.length > 0 ? (
            <View style={styles.section}>
              <Text variant="label" weight="semibold">
                Gastos
              </Text>
              {renderTransactions(expenses)}
            </View>
          ) : null}

          {incomes.length > 0 ? (
            <View style={styles.section}>
              <Text variant="label" weight="semibold">
                Ingresos
              </Text>
              {renderTransactions(incomes)}
            </View>
          ) : null}

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="label" weight="semibold">
                No hay movimientos este día
              </Text>
              <Text tone="secondary" variant="footnote">
                Elige otro día para consultar sus movimientos.
              </Text>
            </View>
          ) : null}
        </BottomSheetScrollView>

        <ModalPrimaryAction
          accessibilityLabel="Agregar movimiento"
          label="Agregar movimiento"
          onPress={() => {
            onClose();
            onAddTransaction(date);
          }}
          style={[styles.addAction, { bottom: bottomInset }]}
          testID="map-add-transaction-button"
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  scroll: { flex: 1, marginTop: spacing.xl },
  content: { gap: spacing.xxl },
  section: { gap: spacing.md },
  list: { gap: spacing.md },
  empty: { gap: spacing.xs, paddingTop: spacing.xl },
  addAction: {
    ...shadows.mainMenu,
    zIndex: 2,
    position: 'absolute',
    left: spacing.none,
    right: spacing.none,
  },
});
