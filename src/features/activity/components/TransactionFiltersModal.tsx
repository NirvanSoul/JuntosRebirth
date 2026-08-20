import Ionicons from '@expo/vector-icons/Ionicons';
import {
  type ComponentProps,
  type PropsWithChildren,
  useEffect,
  useState,
} from 'react';
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
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { iconSize, layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

export type TransactionTypeFilter = 'all' | 'expense' | 'income';
export type CategoryFilter = readonly string[];
export type RecurrenceFilter = 'all' | TransactionRecurrence;

export type TransactionFilters = {
  category: CategoryFilter;
  currency: CurrencyCode;
  date: TransactionDateFilter;
  recurrence: RecurrenceFilter;
  type: TransactionTypeFilter;
};

type TransactionFiltersModalProps = {
  categories: readonly Category[];
  currencies: readonly CurrencyCode[];
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  visible: boolean;
};

type FilterGroup = 'type' | 'category' | 'recurrence' | 'date' | 'currency';

type CollapsibleFilterGroupProps = PropsWithChildren<{
  expanded: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconTestID: string;
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
  icon,
  iconTestID,
  onToggle,
  title,
}: CollapsibleFilterGroupProps) {
  const { colors } = useTheme();

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
        <View style={styles.groupTitle}>
          <Ionicons
            color={colors.textSecondary}
            name={icon}
            size={iconSize.xs}
            testID={iconTestID}
          />
          <Text variant="label">{title}</Text>
        </View>
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
  currencies,
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
  const hasMultipleCurrencies = currencies.length >= 2;

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
    setDraft((current) => ({
      type: 'all',
      category: [],
      currency: current.currency,
      recurrence: 'all',
      date: 'all',
    }));
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
              icon="calendar-outline"
              iconTestID="date-filter-group-icon"
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

            {hasMultipleCurrencies ? (
              <CollapsibleFilterGroup
                expanded={expandedGroup === 'currency'}
                icon="cash-outline"
                iconTestID="currency-filter-group-icon"
                onToggle={() => toggleGroup('currency')}
                title="Moneda"
              >
                <View
                  accessibilityRole="radiogroup"
                  style={styles.currencyOptions}
                >
                  {currencies.map((code) => (
                    <SelectableOption
                      accessibilityLabel={`Moneda: ${getCurrencyName(code)} (${code})`}
                      indicatorTestID={`currency-filter-${code}-indicator`}
                      key={code}
                      label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
                      onPress={() =>
                        setDraft((current) => ({ ...current, currency: code }))
                      }
                      selected={draft.currency === code}
                      testID={`currency-filter-${code}`}
                    />
                  ))}
                </View>
              </CollapsibleFilterGroup>
            ) : null}

            <CollapsibleFilterGroup
              expanded={expandedGroup === 'type'}
              icon="swap-vertical-outline"
              iconTestID="type-filter-group-icon"
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
              icon="pie-chart-outline"
              iconTestID="category-filter-group-icon"
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
                style={{ width, marginLeft: -gutter, overflow: 'visible' }}
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
              icon="sync-outline"
              iconTestID="recurrence-filter-group-icon"
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
                style={{ width, marginLeft: -gutter, overflow: 'visible' }}
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
    gap: spacing.md,
  },
  filterGroup: {
    paddingBottom: spacing.md,
  },
  groupHeader: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupContent: {
    marginTop: spacing.sm,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  currencyOptions: {
    gap: spacing.sm,
  },
  typeOption: {
    flexShrink: 0,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  twoRowGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: spacing.sm,
    overflow: 'visible',
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
