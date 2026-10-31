import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { Text } from '@/components/ui/Text/Text';
import {
  AnimatedChevron,
  AnimatedDisclosureContent,
} from '@/features/activity/components/ActivityCollapsibleSection';
import {
  groupNoticeThreads,
  type UpcomingNotice,
} from '@/features/notifications/utils/upcomingNotices';
import { TransactionPreviewGroupRow } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import { SpaceMembershipProvider } from '@/features/profile/state/SpaceMembershipContext';
import type { Space } from '@/features/spaces/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { minTouchTarget } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type NotificationsModalProps = {
  /**
   * Espacio Juntos, si existe: sus tarjetas muestran la miniatura de quien
   * creó el movimiento aunque el espacio activo sea otro.
   */
  coupleSpace: Space | null;
  notices: readonly UpcomingNotice[];
  onClose: () => void;
  /** Se llama con el modal ya cerrado, para abrir el detalle sin solaparlos. */
  onOpenNotice: (notice: UpcomingNotice) => void;
  /**
   * Nombre de cada espacio, en el orden del menú: decide qué aviso de un hilo
   * queda arriba. Solo se pinta cuando hay más de un espacio.
   */
  spaceLabels: ReadonlyMap<string, string>;
  visible: boolean;
};

/**
 * Secciones por días que faltan, con el máximo de movimientos de cada una.
 * Las de la semana y el mes dan contexto de lo que viene sin ser un aviso.
 */
const sections = [
  { id: 'day-1', maxDays: 1, maxThreads: 5, minDays: 1, title: 'En 1 día' },
  { id: 'day-2', maxDays: 2, maxThreads: 5, minDays: 2, title: 'En 2 días' },
  {
    id: 'week',
    maxDays: 7,
    maxThreads: 10,
    minDays: 3,
    title: 'Dentro de 1 semana',
  },
  {
    id: 'month',
    maxDays: 30,
    maxThreads: 10,
    minDays: 8,
    title: 'Dentro de 1 mes',
  },
] as const;

export function NotificationsModal({
  coupleSpace,
  notices,
  onClose,
  onOpenNotice,
  spaceLabels,
  visible,
}: NotificationsModalProps) {
  const { colors } = useTheme();
  const modalBottomInset = useAppModalBottomInset();
  const pendingNoticeRef = useRef<UpcomingNotice | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [collapsedSections, setCollapsedSections] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const sectionThreads = useMemo(() => {
    const spaceOrder = [...spaceLabels.keys()];
    return sections
      .map((section) => ({
        ...section,
        threads: groupNoticeThreads(
          notices.filter(
            (notice) =>
              notice.daysUntil >= section.minDays &&
              notice.daysUntil <= section.maxDays,
          ),
          spaceOrder,
        ).slice(0, section.maxThreads),
      }))
      .filter((section) => section.threads.length > 0);
  }, [notices, spaceLabels]);
  const noticeByTransactionId = useMemo(
    () => new Map(notices.map((notice) => [notice.transaction.id, notice])),
    [notices],
  );
  const cardExtras = useCallback(
    (transaction: SessionTransaction) => ({
      hideAuthor: transaction.spaceId !== coupleSpace?.id,
      spaceLabel:
        spaceLabels.size > 1 ? spaceLabels.get(transaction.spaceId) : undefined,
    }),
    [coupleSpace?.id, spaceLabels],
  );
  const openNotice = useCallback(
    (transactionId: string) => {
      pendingNoticeRef.current =
        noticeByTransactionId.get(transactionId) ?? null;
      onClose();
    },
    [noticeByTransactionId, onClose],
  );
  const toggleThread = useCallback(
    (threadKey: string) =>
      setExpandedThreads((current) => {
        const next = new Set(current);
        if (next.has(threadKey)) next.delete(threadKey);
        else next.add(threadKey);
        return next;
      }),
    [],
  );
  const toggleSection = useCallback(
    (sectionId: string) =>
      setCollapsedSections((current) => {
        const next = new Set(current);
        if (next.has(sectionId)) next.delete(sectionId);
        else next.add(sectionId);
        return next;
      }),
    [],
  );

  const list = (
    <BottomSheetScrollView
      contentContainerStyle={[
        styles.sections,
        { paddingBottom: modalBottomInset + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {sectionThreads.length === 0 ? (
        <View style={styles.empty} testID="notifications-empty">
          <Ionicons
            color={colors.textMuted}
            name="notifications-off-outline"
            size={previewCardLayout.iconSize}
          />
          <Text style={styles.emptyText} tone="secondary" variant="label">
            No tienes avisos por ahora.
          </Text>
        </View>
      ) : (
        sectionThreads.map((section) => {
          const isExpanded = !collapsedSections.has(section.id);
          return (
            <View
              key={section.id}
              style={styles.section}
              testID={`notifications-section-${section.id}`}
            >
              <Pressable
                accessibilityHint={
                  isExpanded
                    ? 'Oculta los movimientos de esta sección'
                    : 'Muestra los movimientos de esta sección'
                }
                accessibilityLabel={section.title}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                hitSlop={spacing.sm}
                onPress={() => toggleSection(section.id)}
                style={({ pressed }) => [
                  styles.sectionHeader,
                  pressed ? styles.sectionHeaderPressed : null,
                ]}
                testID={`notifications-section-toggle-${section.id}`}
              >
                <Text
                  accessibilityRole="header"
                  tone="secondary"
                  variant="label"
                  weight="semibold"
                >
                  {section.title}
                </Text>
                <AnimatedChevron expanded={isExpanded} />
              </Pressable>
              <AnimatedDisclosureContent expanded={isExpanded}>
                <View style={styles.sectionContent}>
                  {section.threads.map((thread) => {
                    const threadKey = thread[0]!.threadKey;
                    const isThread = thread.length > 1;
                    return (
                      <TransactionPreviewGroupRow
                        cardExtras={cardExtras}
                        categories={thread.map((notice) => notice.category)}
                        groupId={threadKey}
                        isCustomFolder={isThread}
                        isExpandable={isThread}
                        isExpanded={isThread && expandedThreads.has(threadKey)}
                        key={threadKey}
                        onOpenTransactionDetail={openNotice}
                        onToggleGroup={toggleThread}
                        showAuthorName={false}
                        transactions={thread.map(
                          (notice) => notice.transaction,
                        )}
                      />
                    );
                  })}
                </View>
              </AnimatedDisclosureContent>
            </View>
          );
        })
      )}
    </BottomSheetScrollView>
  );

  return (
    <AppModal
      containsScrollable
      extendContentIntoBottomInset
      onClose={onClose}
      previewActions
      onDismissed={() => {
        const notice = pendingNoticeRef.current;
        pendingNoticeRef.current = null;
        if (notice) onOpenNotice(notice);
      }}
      testID="notifications-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={styles.heading}
            variant="heading"
          >
            Notificaciones
          </Text>
          <ModalCloseButton onPress={onClose} />
        </View>

        {/* El censo de Juntos solo se carga con el modal abierto. */}
        {coupleSpace ? (
          <SpaceMembershipProvider space={coupleSpace}>
            {list}
          </SpaceMembershipProvider>
        ) : (
          list
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heading: { flex: 1 },
  sections: { gap: spacing.xl },
  section: { gap: spacing.xs },
  sectionHeader: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderPressed: { opacity: 0.64 },
  sectionContent: { gap: previewCardLayout.listGap },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyText: { textAlign: 'center' },
});
