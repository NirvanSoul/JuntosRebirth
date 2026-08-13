import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  AppModal,
  useAppModalBottomInset,
} from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import { ReminderTimesEditor } from '@/features/transactions/components/ReminderTimesEditor/ReminderTimesEditor';
import type { SaveLocalNotificationRuleInput } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import type {
  TransactionNotificationRule,
  TransactionType,
} from '@/features/transactions/types';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import {
  getDisclosureEntering,
  getDisclosureLayoutTransition,
} from '@/theme/transitions';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type NotificationRulesModalProps = {
  onClose: () => void;
  onSave: (input: SaveLocalNotificationRuleInput) => boolean | Promise<boolean>;
  onSaved?: () => void;
  rules: readonly TransactionNotificationRule[];
  spaceId: string;
  visible: boolean;
};

type RuleDraft = {
  daysBefore: number;
  isEnabled: boolean;
  times: readonly string[];
};

const ruleCards: readonly { label: string; type: TransactionType }[] = [
  { label: 'Gastos', type: 'expense' },
  { label: 'Ingresos', type: 'income' },
];

const daysBeforeOptions: readonly { label: string; value: number }[] = [
  { label: 'Mismo día', value: 0 },
  { label: '1 día antes', value: 1 },
  { label: '2 días antes', value: 2 },
  { label: '3 días antes', value: 3 },
];

function draftFromRule(
  rule: TransactionNotificationRule | undefined,
): RuleDraft {
  return {
    daysBefore: rule?.daysBefore ?? 1,
    isEnabled: rule?.isEnabled ?? false,
    times: rule?.times ?? [],
  };
}

export function NotificationRulesModal({
  onClose,
  onSave,
  onSaved,
  rules,
  spaceId,
  visible,
}: NotificationRulesModalProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const density = useLayoutDensity();
  const floatingButtonHeight = layout.actionHeight[density];
  const modalBottomInset = useAppModalBottomInset();
  const [drafts, setDrafts] = useState<Record<TransactionType, RuleDraft>>({
    expense: draftFromRule(undefined),
    income: draftFromRule(undefined),
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setDrafts({
      expense: draftFromRule(
        rules.find((rule) => rule.transactionType === 'expense'),
      ),
      income: draftFromRule(
        rules.find((rule) => rule.transactionType === 'income'),
      ),
    });
    setError(null);
    setSaving(false);
  }, [rules, visible]);

  const updateDraft = (type: TransactionType, changes: Partial<RuleDraft>) => {
    setDrafts((current) => ({
      ...current,
      [type]: { ...current[type], ...changes },
    }));
  };

  const handleSave = () => {
    const enabledWithoutTimes = ruleCards.find(
      ({ type }) => drafts[type].isEnabled && drafts[type].times.length === 0,
    );
    if (enabledWithoutTimes) {
      setError('Añade al menos una hora a las reglas activadas.');
      return;
    }

    setSaving(true);
    setError(null);

    // Se guarda una regla a la vez: cada guardado reprograma en cadena todas
    // las notificaciones locales del espacio, y dos reconciliaciones a la vez
    // chocan entre sí sobre la misma transacción exclusiva de SQLite.
    void (async () => {
      const results: boolean[] = [];
      for (const { type } of ruleCards) {
        results.push(
          await onSave({
            daysBefore: drafts[type].daysBefore,
            isEnabled: drafts[type].isEnabled,
            spaceId,
            times: drafts[type].times,
            transactionType: type,
          }),
        );
      }
      return results;
    })()
      .then((results) => {
        if (results.every(Boolean)) {
          onSaved?.();
          onClose();
          return;
        }
        setError('No pudimos guardar alguna regla. Inténtalo de nuevo.');
      })
      .catch(() =>
        setError('No pudimos guardar las reglas. Inténtalo de nuevo.'),
      )
      .finally(() => setSaving(false));
  };

  return (
    <AppModal
      containsScrollable
      extendContentIntoBottomInset
      onClose={onClose}
      testID="notification-rules-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Recordatorios y alertas
            </Text>
            <Text tone="secondary" variant="label">
              Elige cuándo avisarte antes de cada gasto o ingreso de este
              espacio.
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <BottomSheetScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                modalBottomInset + floatingButtonHeight + spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          testID="notification-rules-scroll"
        >
          {ruleCards.map(({ label, type }) => {
            const draft = drafts[type];
            const isIncome = type === 'income';
            return (
              <Animated.View
                key={type}
                layout={getDisclosureLayoutTransition()}
                style={styles.card}
              >
                <View style={styles.toggleRow}>
                  <SelectableOption
                    accessibilityLabel={`Activar recordatorios de ${label.toLowerCase()}`}
                    label={`Recordar ${label.toLowerCase()}`}
                    onPress={() =>
                      updateDraft(type, { isEnabled: !draft.isEnabled })
                    }
                    role="checkbox"
                    selected={draft.isEnabled}
                    style={styles.toggleOption}
                    testID={`notification-rule-toggle-${type}`}
                    trailing={
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={styles.diagonalArrow}
                      >
                        <Ionicons
                          color={isIncome ? colors.income : colors.expense}
                          name={isIncome ? 'arrow-up' : 'arrow-down'}
                          size={iconSize.xs}
                        />
                      </View>
                    }
                  />
                </View>

                {draft.isEnabled ? (
                  <Animated.View
                    entering={getDisclosureEntering()}
                    layout={getDisclosureLayoutTransition()}
                    style={styles.cardContent}
                  >
                    <Text tone="secondary" variant="footnote">
                      Días de antelación
                    </Text>
                    <View style={styles.daysRow}>
                      {daysBeforeOptions.map((option) => (
                        <SelectableOption
                          accessibilityLabel={option.label}
                          compact
                          key={option.value}
                          label={option.label}
                          onPress={() =>
                            updateDraft(type, { daysBefore: option.value })
                          }
                          selected={draft.daysBefore === option.value}
                          style={styles.dayOption}
                          testID={`notification-rule-days-${type}-${option.value}`}
                        />
                      ))}
                    </View>

                    <Text
                      style={styles.timesLabel}
                      tone="secondary"
                      variant="footnote"
                    >
                      Horas del aviso
                    </Text>
                    <ReminderTimesEditor
                      onChange={(times) => updateDraft(type, { times })}
                      times={draft.times}
                    />
                  </Animated.View>
                ) : null}
              </Animated.View>
            );
          })}
        </BottomSheetScrollView>

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              marginBottom:
                modalBottomInset + floatingButtonHeight + spacing.sm,
            }}
            tone="expense"
            variant="footnote"
          >
            {error}
          </Text>
        ) : null}

        <ModalPrimaryAction
          accessibilityLabel="Guardar reglas de notificación"
          disabled={isSaving}
          label={isSaving ? 'Guardando…' : 'Guardar'}
          mutedWhenDisabled
          onPress={handleSave}
          style={[styles.saveButton, { bottom: modalBottomInset }]}
          testID="notification-rules-save"
        />
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerText: { flex: 1, gap: spacing.xs },
    scrollContent: { gap: spacing.lg, paddingBottom: spacing.md },
    card: {
      ...shadows.subtle,
      gap: spacing.md,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      padding: spacing.lg,
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    toggleOption: { flex: 1 },
    diagonalArrow: { transform: [{ rotate: '45deg' }] },
    cardContent: { gap: spacing.lg, marginTop: spacing.sm },
    daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    dayOption: { flexGrow: 1 },
    timesLabel: { marginTop: spacing.xs },
    saveButton: {
      ...shadows.subtle,
      position: 'absolute',
      left: 0,
      right: 0,
    },
  });
}
