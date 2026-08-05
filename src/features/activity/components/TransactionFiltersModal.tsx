import { type PropsWithChildren, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  AnimatedChevron,
  AnimatedDisclosureContent,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import {
  formatTransactionDateRangeDate,
  TransactionDateRangePickerModal,
} from '@/features/activity/components/TransactionDateRangePickerModal';
import type { TransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import {
  CategorySelectionCard,
  categorySelectionCardHeight,
} from '@/features/categories/components/CategorySelectionCard/CategorySelectionCard';
import type { Category } from '@/features/categories/types';
import {
  shiftTransactionPeriod,
  type TransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import { TransactionPeriodSelector } from '@/features/transactions/components/TransactionPeriodSelector/TransactionPeriodSelector';
import type { TransactionRecurrence } from '@/features/transactions/types';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

export type TransactionTypeFilter = 'all' | 'expense' | 'income';
export type CategoryFilter = readonly string[];
export type RecurrenceFilter = 'all' | TransactionRecurrence;

export type TransactionFilters = {
  category: CategoryFilter;
  date: TransactionDateFilter;
  recurrence: RecurrenceFilter;
  type: TransactionTypeFilter;
};

type TransactionFiltersModalProps = {
  categories: readonly Category[];
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  visible: boolean;
};

type FilterGroup = 'type' | 'category' | 'recurrence' | 'date';

type CollapsibleFilterGroupProps = PropsWithChildren<{
  expanded: boolean;
  onToggle: () => void;
  title: string;
}>;

const typeOptions: readonly {
  label: string;
  value: TransactionTypeFilter;
}[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
];

const recurrenceOptions: readonly {
  label: string;
  value: RecurrenceFilter;
}[] = [
  { value: 'all', label: 'Todas' },
  { value: 'once', label: 'Único' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizada' },
];

const allCategoriesOption = {
  id: 'all',
  name: 'Todas',
  icon: 'dots-three-circle',
  colorToken: 'slate',
} as const satisfies Pick<Category, 'colorToken' | 'icon' | 'id' | 'name'>;

const filterGridRows = 2;
const filterCategoryColumns = 3;
const selectableOptionHeight = 56;

function CollapsibleFilterGroup({
  children,
  expanded,
  onToggle,
  title,
}: CollapsibleFilterGroupProps) {
  return (
    <Animated.View
      layout={getActivityLayoutTransition()}
      style={styles.filterGroup}
    >
      <Pressable
        accessibilityHint={`${expanded ? 'Oculta' : 'Muestra'} las opciones de ${title.toLowerCase()}`}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={spacing.sm}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.groupHeader,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text variant="label">{title}</Text>
        <AnimatedChevron expanded={expanded} />
      </Pressable>
      <AnimatedDisclosureContent expanded={expanded}>
        <View style={styles.groupContent}>{children}</View>
      </AnimatedDisclosureContent>
    </Animated.View>
  );
}

export function TransactionFiltersModal({
  categories,
  filters,
  onApply,
  onClose,
  visible,
}: TransactionFiltersModalProps) {
  const density = useLayoutDensity();
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState<TransactionFilters>(filters);
  const [dateAnchor, setDateAnchor] = useState(() => new Date());
  const [dateRangePickerVisible, setDateRangePickerVisible] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<FilterGroup | null>(
    'date',
  );
  const gutter = layout.screenGutter[density];
  const categoryCardWidth =
    (width - gutter * 2 - spacing.sm * (filterCategoryColumns - 1)) /
    filterCategoryColumns;
  const categoryGridHeight =
    categorySelectionCardHeight[density] * filterGridRows + spacing.sm;
  const recurrenceGridHeight =
    selectableOptionHeight * filterGridRows + spacing.sm;

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setDateAnchor(
        filters.date === 'all' || filters.date.period === 'custom'
          ? new Date()
          : filters.date.selectedDate,
      );
      setExpandedGroup('date');
    } else {
      setDateRangePickerVisible(false);
    }
  }, [filters, visible]);

  const hasDraftFilters =
    draft.type !== 'all' ||
    draft.category.length > 0 ||
    draft.recurrence !== 'all' ||
    draft.date !== 'all';

  const clearDraft = () => {
    setDraft({
      type: 'all',
      category: [],
      recurrence: 'all',
      date: 'all',
    });
  };

  const toggleGroup = (group: FilterGroup) => {
    setExpandedGroup((current) => (current === group ? null : group));
  };

  const selectDatePeriod = (period: TransactionPeriod) => {
    setDraft((current) => ({
      ...current,
      date: { period, selectedDate: dateAnchor },
    }));
  };

  const shiftDatePeriod = (offset: -1 | 1) => {
    if (draft.date !== 'all' && draft.date.period === 'custom') {
      setDateRangePickerVisible(true);
      return;
    }
    const period = draft.date === 'all' ? 'month' : draft.date.period;
    const nextDate = shiftTransactionPeriod(period, dateAnchor, offset);
    setDateAnchor(nextDate);
    setDraft((current) => ({
      ...current,
      date: { period, selectedDate: nextDate },
    }));
  };

  const customDateRange =
    draft.date !== 'all' && draft.date.period === 'custom'
      ? draft.date
      : undefined;
  const customDateLabel = customDateRange
    ? `${formatTransactionDateRangeDate(customDateRange.startDate)} — ${formatTransactionDateRangeDate(customDateRange.endDate)}`
    : undefined;

  return (
    <>
      <AppModal
        onClose={onClose}
        testID="transaction-filters-modal"
        visible={visible}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" variant="heading">
                Filtrar movimientos
              </Text>
              <Text tone="secondary" variant="footnote">
                Elige qué movimientos quieres ver.
              </Text>
            </View>
            <ModalCloseButton onPress={onClose} />
          </View>

          <View style={styles.groups}>
            <CollapsibleFilterGroup
              expanded={expandedGroup === 'date'}
              onToggle={() => toggleGroup('date')}
              title="Fecha"
            >
              <TransactionPeriodSelector
                includeAllOption
                includeCustomOption
                customLabel={customDateLabel}
                customSelected={Boolean(customDateRange)}
                onNext={() => shiftDatePeriod(1)}
                onPrevious={() => shiftDatePeriod(-1)}
                onSelectAll={() =>
                  setDraft((current) => ({ ...current, date: 'all' }))
                }
                onSelectPeriod={selectDatePeriod}
                onSelectCustom={() => setDateRangePickerVisible(true)}
                period={
                  draft.date === 'all' || draft.date.period === 'custom'
                    ? null
                    : draft.date.period
                }
                selectedDate={dateAnchor}
                testID="activity-date-period-selector"
              />
            </CollapsibleFilterGroup>

            <CollapsibleFilterGroup
              expanded={expandedGroup === 'type'}
              onToggle={() => toggleGroup('type')}
              title="Tipo de movimiento"
            >
              <View accessibilityRole="radiogroup" style={styles.typeOptions}>
                {typeOptions.map((option) => (
                  <SelectableOption
                    accessibilityLabel={`Tipo: ${option.label}`}
                    indicatorTestID={`type-filter-${option.value}-indicator`}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        type: option.value,
                      }))
                    }
                    selected={draft.type === option.value}
                    style={styles.typeOption}
                    testID={`type-filter-${option.value}`}
                  />
                ))}
              </View>
            </CollapsibleFilterGroup>

            <CollapsibleFilterGroup
              expanded={expandedGroup === 'category'}
              onToggle={() => toggleGroup('category')}
              title="Categoría"
            >
              <ScrollView
                contentContainerStyle={[
                  styles.twoRowGrid,
                  {
                    height: categoryGridHeight,
                    paddingHorizontal: gutter,
                  },
                ]}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ width, marginLeft: -gutter }}
                testID="category-filter-scroll"
              >
                <CategorySelectionCard
                  accessibilityLabel="Categoría: Todas"
                  accessibilityRole="checkbox"
                  category={allCategoriesOption}
                  height={categorySelectionCardHeight[density]}
                  onPress={() =>
                    setDraft((current) => ({ ...current, category: [] }))
                  }
                  selected={draft.category.length === 0}
                  showCheckmark
                  testID="category-filter-all"
                  width={categoryCardWidth}
                />
                {categories.map((category) => (
                  <CategorySelectionCard
                    accessibilityLabel={`Categoría: ${category.name}`}
                    accessibilityRole="checkbox"
                    category={category}
                    height={categorySelectionCardHeight[density]}
                    key={category.id}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        category: current.category.includes(category.id)
                          ? current.category.filter((id) => id !== category.id)
                          : [...current.category, category.id],
                      }))
                    }
                    selected={draft.category.includes(category.id)}
                    showCheckmark
                    testID={`category-filter-${category.id}`}
                    width={categoryCardWidth}
                  />
                ))}
              </ScrollView>
            </CollapsibleFilterGroup>

            <CollapsibleFilterGroup
              expanded={expandedGroup === 'recurrence'}
              onToggle={() => toggleGroup('recurrence')}
              title="Recurrencia"
            >
              <ScrollView
                accessibilityRole="radiogroup"
                contentContainerStyle={[
                  styles.twoRowGrid,
                  {
                    height: recurrenceGridHeight,
                    paddingHorizontal: gutter,
                  },
                ]}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ width, marginLeft: -gutter }}
                testID="recurrence-filter-scroll"
              >
                {recurrenceOptions.map((option) => (
                  <SelectableOption
                    accessibilityLabel={`Recurrencia: ${option.label}`}
                    indicatorTestID={`recurrence-filter-${option.value}-indicator`}
                    key={option.value}
                    label={option.label}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        recurrence: option.value,
                      }))
                    }
                    selected={draft.recurrence === option.value}
                    style={styles.horizontalOption}
                    testID={`recurrence-filter-${option.value}`}
                  />
                ))}
              </ScrollView>
            </CollapsibleFilterGroup>
          </View>

          <View style={styles.actions}>
            <ModalPrimaryAction
              accessibilityLabel="Limpiar"
              disabled={!hasDraftFilters}
              label="Limpiar"
              mutedWhenDisabled
              onPress={clearDraft}
              style={styles.clearAction}
              variant="surface"
            />
            <ModalPrimaryAction
              accessibilityLabel="Aplicar filtros"
              label="Aplicar filtros"
              onPress={() => onApply(draft)}
              style={styles.applyAction}
            />
          </View>
        </View>
      </AppModal>
      <TransactionDateRangePickerModal
        initialRange={customDateRange}
        onClose={() => setDateRangePickerVisible(false)}
        onSelect={(range) => {
          setDraft((current) => ({
            ...current,
            date: { ...range, period: 'custom' },
          }));
          setDateRangePickerVisible(false);
        }}
        visible={dateRangePickerVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  groups: {
    gap: spacing.sm,
  },
  filterGroup: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
  },
  groupHeader: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupContent: {
    marginTop: spacing.sm,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  twoRowGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  horizontalOption: {
    minWidth: 168,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  clearAction: { flex: 0.7 },
  applyAction: { flex: 1.5 },
  pressed: {
    opacity: 0.64,
  },
});
