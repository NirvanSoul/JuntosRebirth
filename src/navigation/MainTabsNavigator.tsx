import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveSpaceHeader } from '@/components/navigation/ActiveSpaceHeader/ActiveSpaceHeader';
import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import { AppTabBar } from '@/components/navigation/AppTabBar/AppTabBar';
import {
  CopySuccessToast,
  type CopySuccessNotice,
} from '@/components/overlays/CopySuccessToast/CopySuccessToast';
import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
import { ActivityScreen } from '@/features/activity/screens/ActivityScreen';
import {
  CategoryPickerModal,
  type CategoryPickerSelection,
} from '@/features/categories/components/CategoryPickerModal/CategoryPickerModal';
import { CategoryDetailModal } from '@/features/categories/components/CategoryDetailModal/CategoryDetailModal';
import { CreateCategoryModal } from '@/features/categories/components/CreateCategoryModal/CreateCategoryModal';
import {
  createDefaultCategoryInputForSpace,
  type DefaultCategoryDefinition,
} from '@/features/categories/constants/defaultCategories';
import {
  archiveLocalCategory,
  createLocalCategories,
  createLocalCategory,
  listLocalCategories,
  updateLocalCategory,
} from '@/features/categories/repositories/localCategoryRepository';
import type {
  Category,
  CreateCategoryInput,
} from '@/features/categories/types';
import {
  findEquivalentCategoryBySpace,
  listCategoriesBySpace,
  validateCategoryName,
} from '@/features/categories/utils/categoryCatalog';
import { HomeCurrencyPickerModal } from '@/features/dashboard/components/HomeCurrencyPickerModal/HomeCurrencyPickerModal';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import {
  MapScreen,
  type MapScreenHandle,
} from '@/features/map/screens/MapScreen';
import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { useCurrencyPreferences } from '@/state/appPreferences/useCurrencyPreferences';
import { useHomeComparisonIndicatorsPreference } from '@/state/appPreferences/useHomeComparisonIndicatorsPreference';
import { useHomeCurrencySelection } from '@/state/appPreferences/useHomeCurrencySelection';
import { CreateTransactionModal } from '@/features/transactions/components/CreateTransactionModal/CreateTransactionModal';
import { TransactionDetailModal } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailModal';
import type {
  CreateTransactionDraft,
  SessionTransaction,
  TransactionNotificationRule,
  TransactionReminder,
  TransactionType,
} from '@/features/transactions/types';
import {
  archiveLocalTransaction,
  createLocalTransaction,
  listLocalTransactions,
  updateLocalTransaction,
} from '@/features/transactions/repositories/localTransactionRepository';
import {
  listLocalNotificationRules,
  saveLocalNotificationRule,
  type SaveLocalNotificationRuleInput,
} from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import { reconcileDailyReminder } from '@/features/transactions/services/dailyReminderService';
import { reconcileNotificationRules } from '@/features/transactions/services/notificationRuleService';
import {
  cancelTransactionReminder,
  getTransactionReminder,
  scheduleTransactionReminder,
} from '@/features/transactions/services/transactionReminderService';
import {
  parseProjectedTransactionId,
  projectRecurringTransactions,
} from '@/features/transactions/utils/transactionRecurrence';
import { sortTransactionsByRecentActivity } from '@/features/transactions/utils/transactionSummary';
import { useAppForeground } from '@/hooks/useAppForeground';
import {
  defaultCurrencyCode,
  getCurrencyFlag,
} from '@/lib/currency/currencyCatalog';
import { triggerHaptic } from '@/lib/haptics/haptics';
import type { CreateActionType } from '@/navigation/createActions';
import type { MainTabParamList, RootDrawerParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();
const drawerWidthRatio = 0.88;
const drawerMaxWidth = 380;

type CategoryCreationContext = 'quick' | 'transaction';

function resolveTransactionForDetail(
  transactions: readonly SessionTransaction[],
  transactionId: string | null,
): SessionTransaction | null {
  if (!transactionId) return null;

  const persisted = transactions.find(
    (transaction) => transaction.id === transactionId,
  );
  if (persisted) return persisted;

  const projectedIdentity = parseProjectedTransactionId(transactionId);
  if (!projectedIdentity) return null;

  return (
    projectRecurringTransactions({
      transactions,
      startOn: projectedIdentity.occurredOn,
      endOn: projectedIdentity.occurredOn,
    }).find((transaction) => transaction.id === transactionId) ?? null
  );
}

export function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    activeSpace,
    createSpace,
    error: spacesError,
    isReady,
    selectSpace,
    spaces,
  } = useSpaces();
  const {
    activeCurrencies,
    preferences: currencyPreferences,
    setCurrencyPreferences,
  } = useCurrencyPreferences();
  const {
    selectedCurrency: selectedHomeCurrency,
    setSelectedCurrency: setSelectedHomeCurrency,
  } = useHomeCurrencySelection();
  const {
    enabled: showHomeComparisonIndicators,
    setEnabled: setShowHomeComparisonIndicators,
  } = useHomeComparisonIndicatorsPreference();
  const [activeMainTab, setActiveMainTab] = useState<
    'Home' | 'Activity' | 'Map'
  >('Home');
  const [isHomeCurrencyPickerVisible, setHomeCurrencyPickerVisible] =
    useState(false);
  const [isFloatingCreateButtonVisible, setFloatingCreateButtonVisible] =
    useState(true);
  const [isActivitySummaryPinned, setActivitySummaryPinned] = useState(false);
  const [isCreateMenuVisible, setCreateMenuVisible] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionType>('expense');
  const [isTransactionModalVisible, setTransactionModalVisible] =
    useState(false);
  const [transactionInitialDate, setTransactionInitialDate] = useState<
    string | undefined
  >();
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notificationRules, setNotificationRules] = useState<
    TransactionNotificationRule[]
  >([]);
  const [isFinanceReady, setFinanceReady] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [isCustomCategoryVisible, setCustomCategoryVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [copySuccessNotice, setCopySuccessNotice] =
    useState<CopySuccessNotice | null>(null);
  const [detailCategoryId, setDetailCategoryId] = useState<string | null>(null);
  const [detailTransactionId, setDetailTransactionId] = useState<string | null>(
    null,
  );
  const [detailTransactionReminder, setDetailTransactionReminder] =
    useState<TransactionReminder | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [categoryCreationContext, setCategoryCreationContext] =
    useState<CategoryCreationContext | null>(null);
  const nextCopyNoticeId = useRef(1);
  const activityRequestId = useRef(0);
  const mapScreenRef = useRef<MapScreenHandle>(null);
  const handleScrollDirectionChange = useCallback(
    (direction: 'down' | 'up') => {
      setFloatingCreateButtonVisible(direction === 'up');
    },
    [],
  );
  const activeSpaceCategories = useMemo(
    () => listCategoriesBySpace(categories, activeSpace.id),
    [activeSpace.id, categories],
  );
  const spaceCategories = useMemo(
    () => categories.filter((category) => category.spaceId === activeSpace.id),
    [activeSpace.id, categories],
  );
  const activeSpaceTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.spaceId === activeSpace.id,
      ),
    [activeSpace.id, transactions],
  );
  const activeSpaceNotificationRules = useMemo(
    () => notificationRules.filter((rule) => rule.spaceId === activeSpace.id),
    [activeSpace.id, notificationRules],
  );
  const lastUsedCurrency = useMemo(
    () =>
      sortTransactionsByRecentActivity(activeSpaceTransactions)[0]?.currency,
    [activeSpaceTransactions],
  );
  const hasMultipleHomeCurrencies = activeCurrencies.length > 1;
  const effectiveHomeCurrency =
    (selectedHomeCurrency && activeCurrencies.includes(selectedHomeCurrency)
      ? selectedHomeCurrency
      : activeCurrencies[0]) ?? defaultCurrencyCode;
  const selectedCategory =
    spaceCategories.find((category) => category.id === selectedCategoryId) ??
    null;
  const editingCategory =
    activeSpaceCategories.find(
      (category) => category.id === editingCategoryId,
    ) ?? null;
  const detailCategory =
    activeSpaceCategories.find(
      (category) => category.id === detailCategoryId,
    ) ?? null;
  const detailTransaction = resolveTransactionForDetail(
    activeSpaceTransactions,
    detailTransactionId,
  );
  const editingTransaction = resolveTransactionForDetail(
    activeSpaceTransactions,
    editingTransactionId,
  );
  const detailTransactionCategory = detailTransaction
    ? (spaceCategories.find(
        (category) => category.id === detailTransaction.categoryId,
      ) ?? null)
    : null;
  const shareTargets = spaces
    .filter((space) => space.id !== activeSpace.id)
    .map((space) => ({ id: space.id, name: space.name }));
  const categoryPickerMode =
    categoryCreationContext === 'transaction' &&
    activeSpaceCategories.length > 0
      ? 'select'
      : 'create';

  useEffect(() => {
    const transactionId = detailTransaction?.id;
    if (!transactionId) {
      setDetailTransactionReminder(null);
      return;
    }

    let isMounted = true;
    void getTransactionReminder(transactionId).then((reminder) => {
      if (isMounted) setDetailTransactionReminder(reminder);
    });

    return () => {
      isMounted = false;
    };
  }, [detailTransaction?.id]);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([listLocalCategories(), listLocalTransactions()])
      .then(([storedCategories, storedTransactions]) => {
        if (!isMounted) return;
        setCategories(storedCategories);
        setTransactions(storedTransactions);

        // Las reglas de notificación son una capacidad secundaria: un fallo
        // aquí (tabla nueva, permisos, lo que sea) no debe impedir que el
        // usuario vea sus categorías y movimientos.
        void listLocalNotificationRules()
          .then((storedRules) => {
            if (!isMounted) return;
            setNotificationRules(storedRules);
            return reconcileNotificationRules({
              categories: storedCategories,
              transactions: storedTransactions,
            });
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (isMounted) {
          Alert.alert(
            'No pudimos abrir tus datos',
            'Cierra y vuelve a abrir la app para intentarlo de nuevo.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setFinanceReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isFinanceReady) return;
    void reconcileDailyReminder({ transactions }).catch(() => undefined);
  }, [isFinanceReady, transactions]);

  useAppForeground(() => {
    void reconcileNotificationRules({ categories, transactions }).catch(
      () => undefined,
    );
    void reconcileDailyReminder({ transactions }).catch(() => undefined);
  });

  const showSaveError = useCallback(() => {
    Alert.alert(
      'No pudimos guardar el cambio',
      'Tus datos anteriores siguen intactos. Inténtalo de nuevo.',
    );
  }, []);

  const handleCreateAction = (action: CreateActionType) => {
    setCreateMenuVisible(false);

    if (action === 'income' || action === 'expense') {
      setEditingTransactionId(null);
      setTransactionInitialDate(undefined);
      setSelectedCategoryId(null);
      setTransactionType(action);
      setTransactionModalVisible(true);
      return;
    }

    setCategoryCreationContext('quick');
    setCategoryPickerVisible(true);
  };

  const closeCategoryPicker = () => {
    setCategoryPickerVisible(false);
    setCategoryCreationContext(null);
  };

  const finishCategoryCreation = (category: Category) => {
    setCategories((current) => [...current, category]);

    if (categoryCreationContext === 'transaction') {
      setSelectedCategoryId(category.id);
    }

    setCustomCategoryVisible(false);
    setEditingCategoryId(null);
    closeCategoryPicker();
  };

  const handleCreateCategory = async (input: CreateCategoryInput) => {
    const validation = validateCategoryName(
      input.name,
      categories,
      input.spaceId,
      editingCategoryId ?? undefined,
    );
    if (!validation.valid || input.spaceId !== activeSpace.id) {
      return;
    }

    if (editingCategoryId) {
      const currentCategory = categories.find(
        (category) => category.id === editingCategoryId,
      );
      if (!currentCategory) return;
      try {
        const updated = await updateLocalCategory({
          ...currentCategory,
          name: validation.name,
          icon: input.icon,
          colorToken: input.colorToken,
        });
        setCategories((current) =>
          current.map((category) =>
            category.id === updated.id ? updated : category,
          ),
        );
        setCustomCategoryVisible(false);
        setEditingCategoryId(null);
      } catch {
        showSaveError();
      }
      return;
    }

    try {
      const category = await createLocalCategory({
        spaceId: input.spaceId,
        name: validation.name,
        icon: input.icon,
        colorToken: input.colorToken,
        isDefault: false,
      });
      finishCategoryCreation(category);
    } catch {
      showSaveError();
    }
  };

  const handleCategorySelection = (
    selection: CategoryPickerSelection | null,
  ) => {
    if (!selection) {
      if (
        categoryCreationContext === 'transaction' &&
        editingTransactionId === null
      ) {
        setSelectedCategoryId(null);
      }
      closeCategoryPicker();
      return;
    }

    triggerHaptic('categorySelect');

    if (categoryCreationContext === 'transaction') {
      setSelectedCategoryId(selection.categoryId);
    }
    closeCategoryPicker();
  };

  const handleCreateDefaultCategories = async (
    definitions: readonly DefaultCategoryDefinition[],
  ) => {
    const existingTemplateKeys = new Set(
      activeSpaceCategories.map((category) => category.templateKey),
    );
    const pendingDefinitions = definitions.filter(
      (definition) => !existingTemplateKeys.has(definition.key),
    );
    if (pendingDefinitions.length === 0) return;

    try {
      const createdCategories = await createLocalCategories(
        pendingDefinitions.map((definition) =>
          createDefaultCategoryInputForSpace(activeSpace.id, definition),
        ),
      );
      setCategories((current) => [...current, ...createdCategories]);
      if (categoryCreationContext === 'transaction') {
        setSelectedCategoryId(createdCategories[0]!.id);
      }
      closeCategoryPicker();
    } catch {
      showSaveError();
    }
  };

  const handleTransactionSubmit = async (draft: CreateTransactionDraft) => {
    const categoryBelongsToSpace = spaceCategories.some(
      (category) => category.id === draft.categoryId,
    );
    if (draft.spaceId !== activeSpace.id || !categoryBelongsToSpace) {
      return;
    }

    if (editingTransactionId) {
      try {
        const wasProjected = Boolean(
          parseProjectedTransactionId(editingTransactionId),
        );
        const updatedTransactions = await updateLocalTransaction(
          editingTransactionId,
          draft,
        );
        let nextTransactions: SessionTransaction[] = [];
        if (wasProjected) {
          nextTransactions = await listLocalTransactions();
          setTransactions(nextTransactions);
        } else {
          const updatedTransactionIds = new Set(
            updatedTransactions.map((transaction) => transaction.id),
          );
          setTransactions((current) => {
            nextTransactions = [
              ...updatedTransactions,
              ...current.filter(
                (transaction) => !updatedTransactionIds.has(transaction.id),
              ),
            ];
            return nextTransactions;
          });
        }
        void reconcileNotificationRules({
          categories,
          transactions: nextTransactions,
        }).catch(() => undefined);
        setEditingTransactionId(null);
        setTransactionInitialDate(undefined);
        setTransactionModalVisible(false);
      } catch {
        showSaveError();
      }
      return;
    }

    try {
      const createdTransactions = await createLocalTransaction(draft);
      let nextTransactions: SessionTransaction[] = [];
      setTransactions((current) => {
        nextTransactions = [...createdTransactions, ...current];
        return nextTransactions;
      });
      void reconcileNotificationRules({
        categories,
        transactions: nextTransactions,
      }).catch(() => undefined);
      setTransactionInitialDate(undefined);
      setTransactionModalVisible(false);
    } catch {
      showSaveError();
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await archiveLocalTransaction(transactionId, activeSpace.id);
      let nextTransactions: SessionTransaction[] = [];
      setTransactions((current) => {
        nextTransactions = current.filter(
          (transaction) => transaction.id !== transactionId,
        );
        return nextTransactions;
      });
      setDetailTransactionId(null);
      setDetailTransactionReminder(null);
      void cancelTransactionReminder(transactionId).catch(() => undefined);
      void reconcileNotificationRules({
        categories,
        transactions: nextTransactions,
      }).catch(() => undefined);
    } catch {
      showSaveError();
    }
  };

  const handleSaveTransactionReminder = (
    transactionId: string,
    remindOn: string,
    times: readonly string[],
  ): Promise<boolean> => {
    const source = transactions.find(
      (transaction) => transaction.id === transactionId,
    );
    if (!source || source.spaceId !== activeSpace.id) {
      return Promise.resolve(false);
    }

    const categoryName = spaceCategories.find(
      (category) => category.id === source.categoryId,
    )?.name;

    return scheduleTransactionReminder({
      remindOn,
      spaceId: activeSpace.id,
      times,
      transaction: { ...source, categoryName },
    })
      .then((reminder) => {
        setDetailTransactionReminder(reminder);
        return true;
      })
      .catch(() => false);
  };

  const handleRemoveTransactionReminder = (
    transactionId: string,
  ): Promise<boolean> =>
    cancelTransactionReminder(transactionId)
      .then(() => {
        setDetailTransactionReminder(null);
        return true;
      })
      .catch(() => false);

  const handleSaveNotificationRule = (
    input: SaveLocalNotificationRuleInput,
  ): Promise<boolean> => {
    if (input.spaceId !== activeSpace.id) return Promise.resolve(false);

    return saveLocalNotificationRule(input)
      .then(() => listLocalNotificationRules())
      .then((updatedRules) => {
        setNotificationRules(updatedRules);
        return reconcileNotificationRules({ categories, transactions });
      })
      .then(() => true)
      .catch(() => false);
  };

  const handleArchiveCategory = async (categoryId: string) => {
    try {
      await archiveLocalCategory(categoryId, activeSpace.id);
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId
            ? { ...category, isArchived: true }
            : category,
        ),
      );
    } catch {
      showSaveError();
    }
  };

  const handleSaveCategoryBudget = (
    categoryId: string,
    budgetMinor?: number,
  ) => {
    const category = categories.find((current) => current.id === categoryId);
    if (!category) return;
    void updateLocalCategory({ ...category, budgetMinor })
      .then((updated) => {
        setCategories((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      })
      .catch(showSaveError);
  };

  const handleDismissCopyNotice = useCallback((noticeId: number) => {
    setCopySuccessNotice((current) =>
      current?.id === noticeId ? null : current,
    );
  }, []);

  const handleShareCategory = (
    categoryId: string,
    targetSpaceId: string,
  ): Promise<boolean> => {
    const source = categories.find((category) => category.id === categoryId);
    const targetSpace = spaces.find((space) => space.id === targetSpaceId);
    if (
      !source ||
      source.spaceId !== activeSpace.id ||
      !targetSpace ||
      targetSpace.id === activeSpace.id
    ) {
      return Promise.resolve(false);
    }

    const validation = validateCategoryName(
      source.name,
      categories,
      targetSpaceId,
    );
    if (!validation.valid) return Promise.resolve(false);

    return createLocalCategory({
      ...source,
      spaceId: targetSpaceId,
      name: validation.name,
      isDefault: false,
      templateKey: undefined,
      sourceCategoryId: source.id,
    })
      .then((sharedCategory) => {
        setCategories((current) => [...current, sharedCategory]);
        setCopySuccessNotice({
          destinationName: targetSpace.name,
          id: nextCopyNoticeId.current,
          itemName: source.name,
        });
        nextCopyNoticeId.current += 1;
        return true;
      })
      .catch(() => {
        showSaveError();
        return false;
      });
  };

  const handleCopyTransaction = (
    transactionId: string,
    targetSpaceId: string,
  ): Promise<boolean> => {
    const source = transactions.find(
      (transaction) => transaction.id === transactionId,
    );
    const sourceCategory = source
      ? categories.find((category) => category.id === source.categoryId)
      : undefined;
    const targetSpace = spaces.find((space) => space.id === targetSpaceId);

    if (
      !source ||
      source.spaceId !== activeSpace.id ||
      !sourceCategory ||
      sourceCategory.spaceId !== activeSpace.id ||
      !targetSpace ||
      targetSpace.id === activeSpace.id
    ) {
      return Promise.resolve(false);
    }

    const existingTargetCategory = findEquivalentCategoryBySpace(
      categories,
      targetSpaceId,
      sourceCategory.name,
    );
    return (async () => {
      try {
        const targetCategory =
          existingTargetCategory ??
          (await createLocalCategory({
            ...sourceCategory,
            spaceId: targetSpaceId,
            budgetMinor: undefined,
            isDefault: false,
            templateKey: undefined,
            sourceCategoryId: sourceCategory.id,
          }));
        if (!existingTargetCategory) {
          setCategories((current) => [...current, targetCategory]);
        }
        const copiedTransactions = await createLocalTransaction({
          ...source,
          id: undefined,
          spaceId: targetSpaceId,
          categoryId: targetCategory.id,
          sourceTransactionId: source.id,
          customOccurrenceDates:
            source.recurrence === 'custom' ? [source.occurredOn] : undefined,
        });
        setTransactions((current) => [...current, ...copiedTransactions]);
        setCopySuccessNotice({
          destinationName: targetSpace.name,
          id: nextCopyNoticeId.current,
          itemName: source.title.trim() || sourceCategory.name,
        });
        nextCopyNoticeId.current += 1;
        return true;
      } catch {
        showSaveError();
        return false;
      }
    })();
  };

  if (!isReady || !isFinanceReady) {
    return (
      <View style={styles.loading} testID="spaces-loading">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <Drawer.Navigator
      drawerContent={({ navigation }) => (
        <SpaceSideMenu
          activeSpaceId={activeSpace.id}
          onClose={() => navigation.closeDrawer()}
          onCreateSpace={createSpace}
          onOpenSettings={() => navigation.navigate('Settings')}
          onSelectSpace={selectSpace}
          spaces={spaces}
          storageError={spacesError}
        />
      )}
      initialRouteName="Main"
      screenOptions={{
        drawerStyle: {
          width: Math.min(width * drawerWidthRatio, drawerMaxWidth),
        },
        drawerType: 'front',
        headerShown: false,
        overlayColor: colors.overlay,
        sceneStyle: styles.scene,
      }}
    >
      <Drawer.Screen name="Main">
        {({ navigation }) => (
          <View style={styles.container}>
            <ActiveSpaceHeader
              currencyFlag={
                activeMainTab === 'Home' && hasMultipleHomeCurrencies
                  ? getCurrencyFlag(effectiveHomeCurrency)
                  : undefined
              }
              onCurrencyPress={() => setHomeCurrencyPickerVisible(true)}
              onSpacePress={() => navigation.openDrawer()}
              spaceName={activeSpace.name}
              visible={!isActivitySummaryPinned}
            />
            <Tabs.Navigator
              initialRouteName="Home"
              screenOptions={{ headerShown: false, animation: 'fade' }}
              tabBar={(props) => <AppTabBar {...props} />}
            >
              <Tabs.Screen
                listeners={{ focus: () => setActiveMainTab('Home') }}
                name="Home"
              >
                {({ navigation }) => (
                  <HomeScreen
                    categories={activeSpaceCategories}
                    currency={effectiveHomeCurrency}
                    onCreateCategory={() => handleCreateAction('category')}
                    onCreateExpense={() => handleCreateAction('expense')}
                    onCreateIncome={() => handleCreateAction('income')}
                    onCreateMovement={() => handleCreateAction('expense')}
                    onOpenCategoryDetail={setDetailCategoryId}
                    onOpenTransactionDetail={setDetailTransactionId}
                    onScrollDirectionChange={handleScrollDirectionChange}
                    onViewCategories={() => {
                      activityRequestId.current += 1;
                      navigation.navigate('Activity', {
                        requestId: activityRequestId.current,
                        section: 'categories',
                      });
                    }}
                    onViewMovements={() => {
                      activityRequestId.current += 1;
                      navigation.navigate('Activity', {
                        requestId: activityRequestId.current,
                        section: 'movements',
                      });
                    }}
                    showComparisonIndicators={showHomeComparisonIndicators}
                    transactions={activeSpaceTransactions}
                  />
                )}
              </Tabs.Screen>
              <Tabs.Screen
                listeners={{
                  blur: () => setActivitySummaryPinned(false),
                  focus: () => setActiveMainTab('Activity'),
                }}
                name="Activity"
              >
                {({ route }) => (
                  <ActivityScreen
                    categories={activeSpaceCategories}
                    onCreateCategory={() => handleCreateAction('category')}
                    onCreateExpense={() => handleCreateAction('expense')}
                    onCreateIncome={() => handleCreateAction('income')}
                    onCreateMovement={() => handleCreateAction('expense')}
                    onOpenCategoryDetail={setDetailCategoryId}
                    onOpenTransactionDetail={setDetailTransactionId}
                    onScrollDirectionChange={handleScrollDirectionChange}
                    onSummaryPinnedChange={setActivitySummaryPinned}
                    summaryPinned={isActivitySummaryPinned}
                    targetRequestId={route.params?.requestId}
                    targetSection={route.params?.section}
                    transactions={activeSpaceTransactions}
                  />
                )}
              </Tabs.Screen>
              <Tabs.Screen
                listeners={{
                  focus: () => {
                    setActiveMainTab('Map');
                    mapScreenRef.current?.resetToToday();
                  },
                }}
                name="Map"
              >
                {() => (
                  <MapScreen
                    categories={activeSpaceCategories}
                    onAddTransaction={(date) => {
                      setEditingTransactionId(null);
                      setTransactionInitialDate(date);
                      setSelectedCategoryId(null);
                      setTransactionType('expense');
                      setTransactionModalVisible(true);
                    }}
                    onOpenTransactionDetail={setDetailTransactionId}
                    ref={mapScreenRef}
                    transactions={activeSpaceTransactions}
                  />
                )}
              </Tabs.Screen>
            </Tabs.Navigator>

            <FloatingCreateButton
              bottom={insets.bottom + layout.floatingActionTabOffset}
              onPress={() => setCreateMenuVisible(true)}
              visible={isFloatingCreateButtonVisible}
            />
            <QuickCreateMenu
              onClose={() => setCreateMenuVisible(false)}
              onSelect={handleCreateAction}
              visible={isCreateMenuVisible}
            />
            <CreateTransactionModal
              activeSpaceId={activeSpace.id}
              availableCurrencies={activeCurrencies}
              initialDate={transactionInitialDate}
              initialDraft={editingTransaction ?? undefined}
              lastUsedCurrency={lastUsedCurrency}
              onClose={() => {
                setEditingTransactionId(null);
                setTransactionInitialDate(undefined);
                setTransactionModalVisible(false);
              }}
              onOpenCategoryPicker={() => {
                setCategoryCreationContext('transaction');
                setCategoryPickerVisible(true);
              }}
              onSubmit={handleTransactionSubmit}
              onTypeChange={setTransactionType}
              selectedCategory={selectedCategory}
              type={transactionType}
              visible={isTransactionModalVisible}
            />
            <CategoryPickerModal
              categories={activeSpaceCategories}
              mode={categoryPickerMode}
              onClose={closeCategoryPicker}
              onCreateCategory={() => setCustomCategoryVisible(true)}
              onCreateTemplates={handleCreateDefaultCategories}
              onSelect={handleCategorySelection}
              selectedCategoryId={selectedCategoryId}
              visible={isCategoryPickerVisible}
            />
            <CreateCategoryModal
              categories={categories}
              category={editingCategory}
              onClose={() => {
                setCustomCategoryVisible(false);
                setEditingCategoryId(null);
              }}
              onSubmit={handleCreateCategory}
              spaceId={activeSpace.id}
              spaceName={activeSpace.name}
              visible={isCustomCategoryVisible}
            />
            <CategoryDetailModal
              category={detailCategory}
              onAddTransaction={(categoryId) => {
                setDetailCategoryId(null);
                setTransactionInitialDate(undefined);
                setSelectedCategoryId(categoryId);
                setTransactionType('expense');
                setTransactionModalVisible(true);
              }}
              onClose={() => setDetailCategoryId(null)}
              onDelete={(categoryId) => {
                setDetailCategoryId(null);
                handleArchiveCategory(categoryId);
              }}
              onEdit={(categoryId) => {
                setDetailCategoryId(null);
                setEditingCategoryId(categoryId);
                setCustomCategoryVisible(true);
              }}
              onSaveBudget={handleSaveCategoryBudget}
              onShare={handleShareCategory}
              shareTargets={shareTargets}
              transactions={activeSpaceTransactions}
              visible={detailCategory !== null}
            />
            <TransactionDetailModal
              category={detailTransactionCategory}
              onClose={() => setDetailTransactionId(null)}
              onCopy={handleCopyTransaction}
              onDelete={handleDeleteTransaction}
              onEdit={(transactionId) => {
                const transaction = resolveTransactionForDetail(
                  activeSpaceTransactions,
                  transactionId,
                );
                if (!transaction) return;

                setDetailTransactionId(null);
                setEditingTransactionId(transaction.id);
                setTransactionInitialDate(undefined);
                setSelectedCategoryId(transaction.categoryId);
                setTransactionType(transaction.type);
                setTransactionModalVisible(true);
              }}
              onRemoveReminder={handleRemoveTransactionReminder}
              onSaveReminder={handleSaveTransactionReminder}
              reminder={detailTransactionReminder}
              shareTargets={shareTargets}
              transaction={detailTransaction}
              transactions={activeSpaceTransactions}
              visible={detailTransaction !== null}
            />
            <CopySuccessToast
              notice={copySuccessNotice}
              onDismiss={handleDismissCopyNotice}
            />
            <HomeCurrencyPickerModal
              currencies={activeCurrencies}
              onClose={() => setHomeCurrencyPickerVisible(false)}
              onSelect={(currency) => {
                setHomeCurrencyPickerVisible(false);
                setSelectedHomeCurrency(currency).catch(showSaveError);
              }}
              selectedCurrency={effectiveHomeCurrency}
              visible={isHomeCurrencyPickerVisible}
            />
          </View>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Settings">
        {({ navigation }) => (
          <SettingsScreen
            activeSpaceId={activeSpace.id}
            currencyPreferences={currencyPreferences}
            notificationRules={activeSpaceNotificationRules}
            onBack={() => navigation.navigate('Main')}
            onSaveCurrencyPreferences={(next) => {
              setCurrencyPreferences(next).catch(showSaveError);
            }}
            onSaveNotificationRule={handleSaveNotificationRule}
            onToggleHomeComparisonIndicators={(enabled) => {
              setShowHomeComparisonIndicators(enabled).catch(showSaveError);
            }}
            showHomeComparisonIndicators={showHomeComparisonIndicators}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scene: {
    backgroundColor: 'transparent',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
