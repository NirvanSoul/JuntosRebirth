import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import {
  CopyToSpaceModal,
  type CopyTarget,
} from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { DetailActionMenu } from '@/components/overlays/DetailActionMenu/DetailActionMenu';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { NoteEditorModal } from '@/components/ui/NoteEditorModal/NoteEditorModal';
import { Text } from '@/components/ui/Text/Text';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import type { MoneyAccount } from '@/features/accounts/types';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import { createStyles } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailModal.styles';
import { TransactionReminderModal } from '@/features/transactions/components/TransactionReminderModal/TransactionReminderModal';
import type {
  SessionTransaction,
  TransactionRecurrence,
  TransactionReminder,
} from '@/features/transactions/types';
import { useTransactionAuthor } from '@/features/transactions/hooks/useTransactionAuthor';
import { formatAuthorName } from '@/features/transactions/utils/transactionAuthor';
import {
  getUpcomingTransactionDates,
  parseProjectedTransactionId,
} from '@/features/transactions/utils/transactionRecurrence';
import { formatCurrency } from '@/lib/currency/formatCurrency';
import { triggerHaptic } from '@/lib/haptics/haptics';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type TransactionDetailModalProps = {
  category: Category | null;
  /** Cuenta del movimiento; puede estar archivada y se sigue mostrando. */
  moneyAccount?: MoneyAccount | null;
  onClose: () => void;
  onCopy: (
    transactionId: string,
    targetSpaceId: string,
  ) => boolean | Promise<boolean>;
  onDelete: (transactionId: string) => void;
  onEdit: (transactionId: string) => void;
  onOpenCategoryDetail?: (categoryId: string) => void;
  onRemoveReminder: (transactionId: string) => boolean | Promise<boolean>;
  onSaveNote: (transactionId: string, note: string | null) => void;
  onSaveReminder: (
    transactionId: string,
    remindOn: string,
    times: readonly string[],
  ) => boolean | Promise<boolean>;
  reminder: TransactionReminder | null;
  shareTargets: readonly CopyTarget[];
  transaction: SessionTransaction | null;
  transactions: readonly SessionTransaction[];
  visible: boolean;
};

const recurrencePageSize = 5;

const recurrenceLabels: Record<TransactionRecurrence, string> = {
  once: 'Único',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizada',
};

function formatTransactionDate(occurredOn: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${occurredOn}T12:00:00`));
}

export function TransactionDetailModal({
  category,
  moneyAccount,
  onClose,
  onCopy,
  onDelete,
  onEdit,
  onOpenCategoryDetail,
  onRemoveReminder,
  onSaveNote,
  onSaveReminder,
  reminder,
  shareTargets,
  transaction,
  transactions,
  visible,
}: TransactionDetailModalProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const [isSpacePickerVisible, setSpacePickerVisible] = useState(false);
  const [isReminderModalVisible, setReminderModalVisible] = useState(false);
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);
  const [isDeleteVisible, setDeleteVisible] = useState(false);
  const [isRecurrenceExpanded, setRecurrenceExpanded] = useState(false);
  const [visibleRecurrenceCount, setVisibleRecurrenceCount] =
    useState(recurrencePageSize);
  const modalBottomInset = useAppModalBottomInset();
  // `undefined` en un espacio personal: la fila «Autor» no aportaría nada.
  const author = useTransactionAuthor(transaction?.createdBy ?? '');

  useEffect(() => {
    if (visible) {
      setSpacePickerVisible(false);
      setReminderModalVisible(false);
      setNoteModalVisible(false);
      setDeleteVisible(false);
      setRecurrenceExpanded(false);
      setVisibleRecurrenceCount(recurrencePageSize);
    }
  }, [transaction, visible]);

  useEffect(() => {
    if (visible) {
      triggerHaptic('modalOpen');
    }
  }, [visible]);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const amount = formatCurrency(
    transaction.amountMinor,
    transaction.currency,
    'es-ES',
  );
  const title = transaction.title.trim() || category?.name || 'Movimiento';
  const isProjected = parseProjectedTransactionId(transaction.id) !== null;
  const upcomingDates = getUpcomingTransactionDates({
    count: visibleRecurrenceCount + 1,
    transaction,
    transactions,
  });
  const visibleUpcomingDates = upcomingDates.slice(0, visibleRecurrenceCount);
  const nextOccurrenceOn = visibleUpcomingDates[0];
  const hasMoreRecurrences =
    transaction.recurrence !== 'custom'
      ? nextOccurrenceOn !== undefined
      : upcomingDates.length > visibleRecurrenceCount;
  const nextRecurrenceValue = nextOccurrenceOn
    ? formatTransactionDate(nextOccurrenceOn)
    : transaction.recurrence === 'once'
      ? 'No se repetirá'
      : transaction.recurrence === 'custom'
        ? 'No quedan repeticiones'
        : 'Sin próxima fecha';

  return (
    <>
      <AppModal
        containsScrollable
        extendContentIntoBottomInset
        hideHandle
        onClose={onClose}
        testID="transaction-detail-modal"
        variant="expanded"
        visible={visible}
      >
        <View style={styles.container}>
          <View style={styles.topBar} testID="transaction-detail-top-bar">
            <DetailActionMenu
              itemLabel="movimiento"
              key={transaction.id}
              onDelete={isProjected ? undefined : () => setDeleteVisible(true)}
              onEdit={() => onEdit(transaction.id)}
              testIDPrefix="transaction"
            />
            <ModalCloseButton onPress={onClose} />
          </View>

          <BottomSheetScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: modalBottomInset + spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            testID="transaction-detail-scroll-view"
          >
            <View style={styles.hero}>
              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor: category
                      ? categoryColors[category.colorToken]
                      : colors.textMuted,
                  },
                ]}
              >
                {category ? (
                  <CategoryIcon
                    color={colors.onBrand}
                    name={category.icon}
                    size={iconSize.xl}
                  />
                ) : (
                  <Ionicons
                    color={colors.onBrand}
                    name="receipt"
                    size={iconSize.xl}
                  />
                )}
              </View>
              <View style={styles.titleBlock}>
                <Text
                  align="center"
                  testID="transaction-detail-context"
                  tone="secondary"
                  variant="overline"
                  weight="medium"
                >
                  Movimiento
                </Text>
                <Text
                  align="center"
                  accessibilityRole="header"
                  testID="transaction-detail-title"
                  variant="heading"
                >
                  {title}
                </Text>
              </View>
            </View>

            {isDeleteVisible ? (
              <DestructiveConfirmationPanel
                description={
                  transaction.sourceTransactionId
                    ? 'Es una copia de otro espacio. Se eliminará solo en este espacio; el movimiento original no se verá afectado.'
                    : 'Dejará de aparecer en este espacio y sus totales se actualizarán.'
                }
                onCancel={() => setDeleteVisible(false)}
                onConfirm={() => onDelete(transaction.id)}
                testID="transaction-delete-panel"
                title="¿Eliminar este movimiento?"
              />
            ) : null}

            <View
              accessibilityLabel={`${isIncome ? 'Ingreso' : 'Gasto'} de ${amount}`}
              accessible
              style={styles.amountCard}
              testID="transaction-detail-amount"
            >
              <Text tone="secondary" variant="caption">
                {isIncome ? 'Importe ingresado' : 'Importe gastado'}
              </Text>
              <View style={styles.amountRow}>
                <Text variant="amount">{amount}</Text>
                <View
                  style={styles.directionIcon}
                  testID="transaction-detail-direction-icon"
                >
                  <View style={styles.diagonalArrow}>
                    <Ionicons
                      color={isIncome ? colors.income : colors.expense}
                      name={isIncome ? 'arrow-up' : 'arrow-down'}
                      size={iconSize.sm}
                      testID="transaction-detail-direction-glyph"
                    />
                  </View>
                </View>
              </View>
            </View>

            {!isProjected ? (
              <View style={styles.actionsRow}>
                <Pressable
                  accessibilityLabel={
                    reminder ? 'Editar recordatorio' : 'Programar recordatorio'
                  }
                  accessibilityRole="button"
                  onPress={() => setReminderModalVisible(true)}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    color={colors.textMuted}
                    name="alarm-outline"
                    size={iconSize.md}
                    testID="transaction-action-icon-alarm-outline"
                  />
                  <Text align="center" variant="footnote" weight="semibold">
                    {reminder ? 'Editar recordatorio' : 'Recordar'}
                  </Text>
                </Pressable>
                {shareTargets.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Copiar en otro espacio"
                    accessibilityRole="button"
                    onPress={() => setSpacePickerVisible(true)}
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      color={colors.textMuted}
                      name="copy-outline"
                      size={iconSize.md}
                      testID="transaction-action-icon-copy-outline"
                    />
                    <Text align="center" variant="footnote" weight="semibold">
                      Copiar en otro espacio
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.detailsCard}>
              <Pressable
                accessibilityLabel={`Ver categoría: ${category?.name ?? 'Sin categoría'}`}
                accessibilityRole={
                  category && onOpenCategoryDetail ? 'button' : undefined
                }
                disabled={!category || !onOpenCategoryDetail}
                onPress={() => category && onOpenCategoryDetail?.(category.id)}
                style={({ pressed }) => [
                  styles.detailRow,
                  pressed && styles.pressed,
                ]}
                testID="transaction-detail-category-row"
              >
                {category ? (
                  <CategoryIcon
                    color={categoryColors[category.colorToken]}
                    name={category.icon}
                    size={iconSize.sm}
                  />
                ) : (
                  <Ionicons
                    color={colors.textMuted}
                    name="receipt-outline"
                    size={iconSize.sm}
                  />
                )}
                <View style={styles.detailCopy}>
                  <Text tone="secondary" variant="caption">
                    Categoría
                  </Text>
                  <Text variant="label">
                    {category?.name ?? 'Sin categoría'}
                  </Text>
                </View>
                {category && onOpenCategoryDetail ? (
                  <Ionicons
                    color={colors.textMuted}
                    name="chevron-forward"
                    size={iconSize.sm}
                  />
                ) : null}
              </Pressable>
              {moneyAccount ? (
                <>
                  <View style={styles.divider} />
                  <View
                    style={styles.detailRow}
                    testID="transaction-detail-money-account-row"
                  >
                    <MoneyAccountIcon
                      color={categoryColors[moneyAccount.colorToken]}
                      name={moneyAccount.icon}
                      size={iconSize.sm}
                    />
                    <View style={styles.detailCopy}>
                      <Text tone="secondary" variant="caption">
                        Cuenta
                      </Text>
                      <Text variant="label">{moneyAccount.name}</Text>
                    </View>
                  </View>
                </>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Ionicons
                  color={colors.textMuted}
                  name="calendar-outline"
                  size={iconSize.sm}
                />
                <View style={styles.detailCopy}>
                  <Text tone="secondary" variant="caption">
                    Fecha
                  </Text>
                  <Text variant="label">
                    {formatTransactionDate(transaction.occurredOn)}
                  </Text>
                </View>
              </View>
              {author ? (
                <>
                  <View style={styles.divider} />
                  <View
                    style={styles.detailRow}
                    testID="transaction-detail-author-row"
                  >
                    <Avatar
                      size={iconSize.sm}
                      uri={author.profile?.avatarUri}
                    />
                    <View style={styles.detailCopy}>
                      <Text tone="secondary" variant="caption">
                        Autor
                      </Text>
                      <Text variant="label">{formatAuthorName(author)}</Text>
                    </View>
                  </View>
                </>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Ionicons
                  color={colors.textMuted}
                  name="sync-outline"
                  size={iconSize.sm}
                  testID="transaction-detail-recurrence-icon"
                />
                <View style={styles.detailCopy}>
                  <Text tone="secondary" variant="caption">
                    Recurrencia
                  </Text>
                  <Text variant="label">
                    {recurrenceLabels[transaction.recurrence]}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable
                accessibilityLabel={`Próxima repetición: ${nextRecurrenceValue}`}
                accessibilityRole={nextOccurrenceOn ? 'button' : undefined}
                accessibilityState={
                  nextOccurrenceOn
                    ? { expanded: isRecurrenceExpanded }
                    : undefined
                }
                disabled={!nextOccurrenceOn}
                onPress={() => setRecurrenceExpanded((current) => !current)}
                style={({ pressed }) => [
                  styles.detailRow,
                  pressed && styles.pressed,
                ]}
                testID="transaction-detail-next-recurrence"
              >
                <Ionicons
                  color={colors.textMuted}
                  name="calendar-clear-outline"
                  size={iconSize.sm}
                />
                <View style={styles.detailCopy}>
                  <Text tone="secondary" variant="caption">
                    Próxima repetición
                  </Text>
                  <Text variant="label">{nextRecurrenceValue}</Text>
                </View>
                {nextOccurrenceOn ? (
                  <View
                    style={
                      isRecurrenceExpanded
                        ? styles.recurrenceChevronExpanded
                        : undefined
                    }
                    testID="transaction-detail-recurrence-chevron"
                  >
                    <Ionicons
                      color={colors.textMuted}
                      name="chevron-down"
                      size={iconSize.sm}
                    />
                  </View>
                ) : null}
              </Pressable>
              {isRecurrenceExpanded ? (
                <View
                  style={styles.recurrenceList}
                  testID="transaction-detail-recurrence-list"
                >
                  <Text tone="secondary" variant="caption">
                    Próximas repeticiones
                  </Text>
                  {visibleUpcomingDates.map((date, index) => (
                    <View key={date} style={styles.recurrenceDateRow}>
                      <Text tone="secondary" variant="footnote">
                        {index + 1}.
                      </Text>
                      <Text variant="label">{formatTransactionDate(date)}</Text>
                    </View>
                  ))}
                  {hasMoreRecurrences ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setVisibleRecurrenceCount(
                          (current) => current + recurrencePageSize,
                        )
                      }
                      style={({ pressed }) => [
                        styles.moreButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text tone="brand" variant="label" weight="semibold">
                        Ver más
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

            {!isProjected ? (
              <Pressable
                accessibilityLabel={
                  transaction.note ? transaction.note : 'Escribir nota'
                }
                accessibilityRole="button"
                onPress={() => setNoteModalVisible(true)}
                style={({ pressed }) => [
                  styles.noteButton,
                  pressed && styles.pressed,
                ]}
                testID="transaction-detail-note"
              >
                <View style={styles.noteButtonCopy}>
                  {transaction.note ? (
                    <Text tone="secondary" variant="caption">
                      Nota
                    </Text>
                  ) : null}
                  <Text
                    numberOfLines={transaction.note ? 2 : 1}
                    tone={transaction.note ? 'primary' : 'secondary'}
                    variant="label"
                  >
                    {transaction.note ? transaction.note : 'Escribir Nota'}
                  </Text>
                </View>
                <Ionicons
                  color={colors.textMuted}
                  name="chevron-forward"
                  size={iconSize.sm}
                />
              </Pressable>
            ) : null}
          </BottomSheetScrollView>
        </View>
      </AppModal>

      <CopyToSpaceModal
        description="Elige dónde crear una copia independiente de este movimiento."
        failureMessage={(target) =>
          `No se pudo copiar el movimiento en ${target.name}.`
        }
        itemName={title}
        onClose={() => setSpacePickerVisible(false)}
        onSelect={(targetSpaceId) => onCopy(transaction.id, targetSpaceId)}
        targets={shareTargets}
        testID="transaction-space-picker-modal"
        visible={isSpacePickerVisible}
      />

      <TransactionReminderModal
        onClose={() => setReminderModalVisible(false)}
        onRemove={() => onRemoveReminder(transaction.id)}
        onSave={({ remindOn, times }) =>
          onSaveReminder(transaction.id, remindOn, times)
        }
        reminder={reminder}
        transactionOccurredOn={transaction.occurredOn}
        transactionTitle={title}
        visible={isReminderModalVisible}
      />

      <NoteEditorModal
        onClose={() => setNoteModalVisible(false)}
        onSave={(note) => {
          onSaveNote(transaction.id, note);
          setNoteModalVisible(false);
        }}
        saveColor={
          category ? categoryColors[category.colorToken] : colors.textMuted
        }
        saveTone={
          category
            ? getCategoryContentContrast(category.colorToken).tone
            : undefined
        }
        subtitle={title}
        testID="transaction-note-modal"
        value={transaction.note}
        visible={isNoteModalVisible}
      />
    </>
  );
}
