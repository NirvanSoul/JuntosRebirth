import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import {
  FilterNoticeToast,
  useFilterNotice,
} from '@/features/activity/components/FilterNoticeToast';
import { TransactionChoiceFilterGroup } from '@/features/activity/components/TransactionChoiceFilterGroup';
import { TransactionFilterGroup } from '@/features/activity/components/TransactionFilterGroup';
import { TransactionRecurrenceFilterOptions } from '@/features/activity/components/TransactionRecurrenceFilterOptions';
import { TransactionTypeFilterOptions } from '@/features/activity/components/TransactionTypeFilterOptions';
import type { TransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import {
  CategorySelectionCard,
  categorySelectionCardHeight,
} from '@/features/categories/components/CategorySelectionCard/CategorySelectionCard';
import type { Category } from '@/features/categories/types';
import type { TransactionRecurrence } from '@/features/transactions/types';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

export type TransactionTypeFilter = 'all' | 'expense' | 'income';
export type CategoryFilter = readonly string[];
export type RecurrenceFilter = 'all' | TransactionRecurrence;
export type TransactionAuthorFilter = 'all' | 'own' | 'partner';

export type TransactionAuthorFilterOption = {
  label: string;
  value: TransactionAuthorFilter;
};

export type TransactionFilters = {
  category: CategoryFilter;
  currency: CurrencyCode;
  date: TransactionDateFilter;
  recurrence: RecurrenceFilter;
  type: TransactionTypeFilter;
  author?: TransactionAuthorFilter;
};

type TransactionFiltersModalProps = {
  /** Opciones de autor; sin ellas (espacio personal) no se muestra el grupo. */
  authorOptions?: readonly TransactionAuthorFilterOption[];
  categories: readonly Category[];
  currencies: readonly CurrencyCode[];
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  previewMode?: 'cards' | 'pills';
  onApplyPreviewMode?: (mode: 'cards' | 'pills') => void;
  /**
   * Recibe el borrador en cuanto cambia, con el modal abierto, para que la
   * pantalla lo muestre detrás. Quien lo usa revierte al cerrar sin aplicar.
   */
  onPreview?: (
    filters: TransactionFilters,
    previewMode: 'cards' | 'pills',
  ) => void;
  /**
   * `author` deja solo el autor y `calendar` quita la moneda. La fecha nunca
   * está aquí: cada pantalla la elige con su selector de periodo, fuera del
   * modal, y el borrador la conserva tal cual.
   */
  variant?: 'all' | 'author' | 'calendar';
  visible: boolean;
};

type FilterGroup =
  'visualization' | 'type' | 'category' | 'recurrence' | 'currency' | 'author';

const allCategoriesOption = {
  id: 'all',
  name: 'Todas',
  icon: 'dots-three-circle',
  colorToken: 'slate',
} as const satisfies Pick<Category, 'colorToken' | 'icon' | 'id' | 'name'>;

const filterGridRows = 2;
const filterCategoryColumns = 3;

export function TransactionFiltersModal({
  authorOptions,
  categories,
  currencies,
  filters,
  onApply,
  onClose,
  previewMode,
  onApplyPreviewMode,
  onPreview,
  variant = 'all',
  visible,
}: TransactionFiltersModalProps) {
  const density = useLayoutDensity();
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState<TransactionFilters>(filters);
  const [draftPreviewMode, setDraftPreviewMode] = useState(
    previewMode ?? 'pills',
  );
  const hasAuthorFilter = (authorOptions?.length ?? 0) > 0;
  const initialExpandedGroup: FilterGroup =
    variant === 'calendar' && previewMode
      ? 'visualization'
      : variant === 'author' || hasAuthorFilter
        ? 'author'
        : 'type';
  const [expandedGroup, setExpandedGroup] = useState<FilterGroup | null>(
    initialExpandedGroup,
  );
  const gutter = layout.screenGutter[density];
  const categoryCardWidth =
    (width - gutter * 2 - spacing.sm * (filterCategoryColumns - 1)) /
    filterCategoryColumns;
  const categoryGridHeight =
    categorySelectionCardHeight[density] * filterGridRows + spacing.sm;
  const hasMultipleCurrencies = currencies.length >= 2;
  const hasCurrencyFilter = variant === 'all';
  const hasMovementFilters = variant !== 'author';

  // Reiniciar el borrador solo al abrir.
  if (useDepsChanged([visible])) {
    if (visible) {
      setDraft(filters);
      setDraftPreviewMode(previewMode ?? 'pills');
      setExpandedGroup(initialExpandedGroup);
    }
  }

  useEffect(() => {
    if (visible) onPreview?.(draft, draftPreviewMode);
  }, [draft, draftPreviewMode, onPreview, visible]);

  const { announceFilters, dismissFilterNotice, filterNotice } =
    useFilterNotice();
  const countActive = (value: TransactionFilters) =>
    Number(hasAuthorFilter && (value.author ?? 'all') !== 'all') +
    (hasMovementFilters
      ? Number(value.type !== 'all') +
        Number(value.category.length > 0) +
        Number(value.recurrence !== 'all')
      : 0);
  const appliedFilterCount = countActive(filters);
  const canClear = countActive(draft) > 0 || appliedFilterCount > 0;

  const applyDraft = (nextFilters: TransactionFilters) => {
    announceFilters(countActive(nextFilters), appliedFilterCount);
    onApply(nextFilters);
  };

  // Limpiar aplica al momento: quita también los filtros ya aplicados y lo
  // avisa, sin pasar por «Aplicar filtros». La moneda no cuenta como filtro.
  const clearFilters = () => {
    const cleared: TransactionFilters = {
      type: 'all',
      category: [],
      currency: draft.currency,
      recurrence: 'all',
      date: draft.date,
      author: hasAuthorFilter ? 'all' : draft.author,
    };
    setDraft(cleared);
    applyDraft(cleared);
  };

  const toggleGroup = (group: FilterGroup) => {
    setExpandedGroup((current) => (current === group ? null : group));
  };

  return (
    <>
      <AppModal
        onClose={onClose}
        // Se abre también sobre otros modales (periodo, categoría): apilarlo
        // evita que `replace` cierre la hoja de debajo.
        stackBehavior="push"
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
            {variant === 'calendar' && previewMode ? (
              <TransactionChoiceFilterGroup
                expanded={expandedGroup === 'visualization'}
                icon="grid-outline"
                onToggle={() => toggleGroup('visualization')}
                onSelect={setDraftPreviewMode}
                options={[
                  { value: 'cards', label: 'Medianas' },
                  { value: 'pills', label: 'Pequeñas' },
                ]}
                prefix="visualization"
                selected={draftPreviewMode}
                title="Visualización"
              />
            ) : null}
            {hasAuthorFilter ? (
              <TransactionChoiceFilterGroup
                expanded={expandedGroup === 'author'}
                icon="person-outline"
                onToggle={() => toggleGroup('author')}
                onSelect={(author) =>
                  setDraft((current) => ({ ...current, author }))
                }
                options={authorOptions ?? []}
                prefix="author"
                selected={draft.author ?? 'all'}
                title="Autor"
              />
            ) : null}

            {hasMultipleCurrencies && hasCurrencyFilter ? (
              <TransactionFilterGroup
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
                      indicator={false}
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
              </TransactionFilterGroup>
            ) : null}

            {hasMovementFilters ? (
              <TransactionFilterGroup
                expanded={expandedGroup === 'type'}
                icon="swap-vertical-outline"
                iconTestID="type-filter-group-icon"
                onToggle={() => toggleGroup('type')}
                title="Tipo de movimiento"
              >
                <TransactionTypeFilterOptions
                  onSelect={(type) =>
                    setDraft((current) => ({ ...current, type }))
                  }
                  selected={draft.type}
                />
              </TransactionFilterGroup>
            ) : null}

            {hasMovementFilters ? (
              <TransactionFilterGroup
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
                            ? current.category.filter(
                                (id) => id !== category.id,
                              )
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
              </TransactionFilterGroup>
            ) : null}

            {hasMovementFilters ? (
              <TransactionFilterGroup
                expanded={expandedGroup === 'recurrence'}
                icon="sync-outline"
                iconTestID="recurrence-filter-group-icon"
                onToggle={() => toggleGroup('recurrence')}
                title="Recurrencia"
              >
                <TransactionRecurrenceFilterOptions
                  onSelect={(recurrence) =>
                    setDraft((current) => ({ ...current, recurrence }))
                  }
                  selected={draft.recurrence}
                />
              </TransactionFilterGroup>
            ) : null}
          </View>

          <View style={styles.actions}>
            <ModalPrimaryAction
              accessibilityLabel="Limpiar"
              disabled={!canClear}
              label="Limpiar"
              mutedWhenDisabled
              onPress={clearFilters}
              style={styles.clearAction}
              variant="surface"
            />
            <ModalPrimaryAction
              accessibilityLabel="Aplicar filtros"
              label="Aplicar filtros"
              onPress={() => {
                if (variant === 'calendar' && previewMode)
                  onApplyPreviewMode?.(draftPreviewMode);
                applyDraft(draft);
              }}
              style={styles.applyAction}
            />
          </View>
        </View>
      </AppModal>
      <FilterNoticeToast
        notice={filterNotice}
        onDismiss={dismissFilterNotice}
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
  currencyOptions: {
    gap: spacing.sm,
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
});
