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
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
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
  updateLocalCategoryNote,
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
import { ImportScreen } from '@/features/import/screens/ImportScreen';
import {
  MapScreen,
  type MapScreenHandle,
} from '@/features/map/screens/MapScreen';
import { AuthModal } from '@/features/settings/components/AuthModal';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import { PendingInvitationBanner } from '@/features/spaces/components/PendingInvitationBanner';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { AcceptInvitationScreen } from '@/features/spaces/screens/AcceptInvitationScreen';
import { AwaitingPartnerScreen } from '@/features/spaces/screens/AwaitingPartnerScreen';
import { InvitePartnerScreen } from '@/features/spaces/screens/InvitePartnerScreen';
import { isAwaitingPartnerSpace } from '@/features/spaces/types';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncCoupleSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { useHomeComparisonIndicatorsPreference } from '@/state/appPreferences/useHomeComparisonIndicatorsPreference';
import { useVisibleCurrencyCatalog } from '@/state/appPreferences/useVisibleCurrencyCatalog';
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
  updateLocalTransactionNote,
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
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';
import { parseProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';
import { useAppForeground } from '@/hooks/useAppForeground';
import {
  getCurrencyFlag,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';
import type { CreateActionType } from '@/navigation/createActions';
import type { MainTabParamList, RootDrawerParamList } from '@/navigation/types';
import { layout } from '@/theme/layout';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();
const drawerWidthRatio = 0.88;
const drawerMaxWidth = 380;

/** Tablas del espacio de pareja cuya actividad debe refrescar los datos. */
const coupleSpaceRealtimeTables = [
  'categories',
  'recurring_transaction_series',
  'transactions',
] as const;

type CategoryCreationContext = 'quick' | 'transaction';
type CategoryDetailRequest = {
  categoryId: string;
  displayCurrency: CurrencyCode;
};

export function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    activeSpace,
    createCoupleSpace,
    createSpace,
    dissolveCoupleSpace,
    error: spacesError,
    isReady,
    refreshCoupleSpace,
    selectSpace,
    spaces,
  } = useSpaces();
  const { session } = useAuthSession();
  const [isInvitePartnerVisible, setInvitePartnerVisible] = useState(false);
  const [isSpaceAuthModalVisible, setSpaceAuthModalVisible] = useState(false);
  const coupleSpace = spaces.find((space) => space.type === 'couple') ?? null;
  // Un espacio juntos sin la otra persona dentro no tiene datos que mostrar ni
  // que sincronizar: Inicio pasa a la pantalla de espera y toda la maquinaria
  // compartida (sondeo, realtime, publicación) queda en pausa hasta que acepte.
  const isAwaitingPartner = isAwaitingPartnerSpace(activeSpace);
  const {
    enabled: showHomeComparisonIndicators,
    setEnabled: setShowHomeComparisonIndicators,
  } = useHomeComparisonIndicatorsPreference();
  const [activeMainTab, setActiveMainTab] = useState<
    'Home' | 'Activity' | 'Map'
  >('Home');
  // Se incrementan en cada foco de su pestaña para reiniciar la animación de
  // revelado del arco de balance y del donut de categorías.
  const [homeChartResetKey, setHomeChartResetKey] = useState(0);
  const [activityChartResetKey, setActivityChartResetKey] = useState(0);
  const [isFloatingCreateButtonVisible, setFloatingCreateButtonVisible] =
    useState(true);
  const [isActivitySummaryPinned, setActivitySummaryPinned] = useState(false);
  const [isCreateMenuVisible, setCreateMenuVisible] = useState(false);
  const [isImportVisible, setImportVisible] = useState(false);
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
  const [detailRequest, setDetailRequest] =
    useState<CategoryDetailRequest | null>(null);
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
  const movementCurrencies = useMemo(
    () => activeSpaceTransactions.map((transaction) => transaction.currency),
    [activeSpaceTransactions],
  );
  const showSaveError = useCallback(() => {
    Alert.alert(
      'No pudimos guardar el cambio',
      'Tus datos anteriores siguen intactos. Inténtalo de nuevo.',
    );
  }, []);
  const {
    closeHomeCurrencyPicker,
    effectiveHomeCurrency,
    hasMultipleVisibleCurrencies,
    isHomeCurrencyPickerVisible,
    preferences: currencyPreferences,
    pressHomeCurrency: handleHomeCurrencyPress,
    selectHomeCurrency,
    setCurrencyPreferences,
    visibleCurrencies,
  } = useVisibleCurrencyCatalog({
    movementCurrencies,
    onSaveError: showSaveError,
    spaceCurrency: activeSpace.currency,
  });
  const selectedCategory =
    spaceCategories.find((category) => category.id === selectedCategoryId) ??
    null;
  const editingCategory =
    activeSpaceCategories.find(
      (category) => category.id === editingCategoryId,
    ) ?? null;
  const detailCategory = detailRequest
    ? (activeSpaceCategories.find(
        (category) => category.id === detailRequest.categoryId,
      ) ?? null)
    : null;
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

  const reloadLocalFinance = useCallback(async (): Promise<void> => {
    const [storedCategories, storedTransactions] = await Promise.all([
      listLocalCategories(),
      listLocalTransactions(),
    ]);
    setCategories(storedCategories);
    setTransactions(storedTransactions);
    void reconcileNotificationRules({
      categories: storedCategories,
      transactions: storedTransactions,
    }).catch(() => undefined);
  }, []);

  const refreshSharedCoupleData = useCallback(
    async (spaceId?: string): Promise<void> => {
      if (!session) return;

      if (spaceId) {
        try {
          await syncCoupleSpaceDataForCurrentSession({ spaceId });
        } catch (error) {
          console.error('[sync] Subida de espacio compartido falló:', error);
        }
      }

      try {
        await restoreRemoteAccountForCurrentSession();
        await reloadLocalFinance();
      } catch (error) {
        console.error('[sync] Restauración remota falló:', error);
      }
    },
    [reloadLocalFinance, session],
  );

  const publishCoupleSpaceChanges = useCallback(
    (spaceId: string) => {
      if (
        !session ||
        !spaces.some(
          (space) =>
            space.id === spaceId &&
            space.type === 'couple' &&
            !isAwaitingPartnerSpace(space),
        )
      ) {
        return;
      }
      void syncCoupleSpaceDataForCurrentSession({ spaceId }).catch((error) => {
        console.error('[sync] Publicación en segundo plano falló:', error);
      });
    },
    [session, spaces],
  );

  const publishActiveCoupleChanges = useCallback(() => {
    publishCoupleSpaceChanges(activeSpace.id);
  }, [activeSpace.id, publishCoupleSpaceChanges]);

  const refreshCoupleSpaceAndData = useCallback(async (): Promise<void> => {
    await refreshCoupleSpace();
    await refreshSharedCoupleData();
  }, [refreshCoupleSpace, refreshSharedCoupleData]);

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

    void reloadLocalFinance()
      .then(() => {
        if (!isMounted) return;
        // Las reglas de notificación son una capacidad secundaria: un fallo
        // aquí (tabla nueva, permisos, lo que sea) no debe impedir que el
        // usuario vea sus categorías y movimientos.
        void listLocalNotificationRules()
          .then((storedRules) => {
            if (!isMounted) return;
            setNotificationRules(storedRules);
          })
          .catch(() => undefined);
      })
      .catch((error: unknown) => {
        console.error('[MainTabsNavigator]', error);
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
  }, [reloadLocalFinance]);

  useEffect(() => {
    if (!isFinanceReady) return;
    void reconcileDailyReminder({ transactions }).catch(() => undefined);
  }, [isFinanceReady, transactions]);

  useAppForeground(() => {
    void reconcileNotificationRules({ categories, transactions }).catch(
      () => undefined,
    );
    void reconcileDailyReminder({ transactions }).catch(() => undefined);
    if (activeSpace.type === 'couple' && !isAwaitingPartner) {
      void refreshSharedCoupleData(activeSpace.id);
    }
  });

  useEffect(() => {
    if (
      !isFinanceReady ||
      activeSpace.type !== 'couple' ||
      isAwaitingPartner ||
      !session
    )
      return;
    void refreshSharedCoupleData(activeSpace.id);

    const refreshTimer = setInterval(() => {
      void refreshSharedCoupleData(activeSpace.id);
    }, 15_000);
    return () => clearInterval(refreshTimer);
  }, [
    activeSpace.id,
    activeSpace.type,
    isAwaitingPartner,
    isFinanceReady,
    refreshSharedCoupleData,
    session,
  ]);

  useEffect(() => {
    if (
      !isFinanceReady ||
      activeSpace.type !== 'couple' ||
      isAwaitingPartner ||
      !session
    )
      return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRemoteRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refreshSharedCoupleData(activeSpace.id);
      }, 200);
    };

    let channel: ReturnType<
      ReturnType<typeof getConfiguredSupabaseClient>['channel']
    > | null = null;
    try {
      const client = getConfiguredSupabaseClient();
      const changeFilter = `space_id=eq.${activeSpace.id}`;
      channel = coupleSpaceRealtimeTables
        .reduce(
          (subscription, table) =>
            subscription.on(
              'postgres_changes',
              { event: '*', schema: 'public', table, filter: changeFilter },
              scheduleRemoteRefresh,
            ),
          client.channel(`couple-space-sync:${activeSpace.id}`),
        )
        .subscribe();
    } catch {
      // El sondeo y la restauración al reabrir siguen siendo el respaldo si
      // Realtime no está disponible temporalmente.
    }

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) {
        void getConfiguredSupabaseClient().removeChannel(channel);
      }
    };
  }, [
    activeSpace.id,
    activeSpace.type,
    isAwaitingPartner,
    isFinanceReady,
    refreshSharedCoupleData,
    session,
  ]);

  const handleInvitePartner = useCallback(() => {
    if (!session) {
      setSpaceAuthModalVisible(true);
      return;
    }
    setInvitePartnerVisible(true);
  }, [session]);

  /**
   * Descarta un espacio juntos que nunca llegó a tener dos personas.
   * `dissolve_couple_space` lo borra entero en ese caso (no lo archiva) y
   * `useSpaces` devuelve la selección al espacio Personal.
   */
  const handleCancelPendingCoupleSpace =
    useCallback(async (): Promise<void> => {
      try {
        await dissolveCoupleSpace();
      } catch (caught) {
        Alert.alert(
          'No pudimos cancelar el espacio',
          caught instanceof Error
            ? caught.message
            : 'Inténtalo de nuevo en un momento.',
        );
      }
    }, [dissolveCoupleSpace]);

  const handleCreateAction = (action: CreateActionType) => {
    setCreateMenuVisible(false);

    if (action === 'income' || action === 'expense') {
      setEditingTransactionId(null);
      setTransactionInitialDate(undefined);
      setSelectedCategoryId(null);
      setCategoryCreationContext(null);
      setCategoryPickerVisible(false);
      setTransactionType(action);
      setTransactionModalVisible(true);
      return;
    }

    if (action === 'import') {
      setImportVisible(true);
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
        publishActiveCoupleChanges();
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
      publishActiveCoupleChanges();
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
      publishActiveCoupleChanges();
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
        publishActiveCoupleChanges();
        setEditingTransactionId(null);
        setTransactionInitialDate(undefined);
        setTransactionModalVisible(false);
      } catch (error) {
        console.error('[MainTabsNavigator] updateLocalTransaction', error);
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
      publishActiveCoupleChanges();
      setTransactionInitialDate(undefined);
      setTransactionModalVisible(false);
    } catch (error) {
      console.error('[MainTabsNavigator] createLocalTransaction', error);
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
      publishActiveCoupleChanges();
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
      publishActiveCoupleChanges();
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
        publishActiveCoupleChanges();
      })
      .catch(showSaveError);
  };

  const handleSaveCategoryNote = (categoryId: string, note: string | null) => {
    void updateLocalCategoryNote(categoryId, activeSpace.id, note)
      .then(() => {
        setCategories((current) =>
          current.map((item) =>
            item.id === categoryId
              ? { ...item, note: note ?? undefined }
              : item,
          ),
        );
        publishActiveCoupleChanges();
      })
      .catch(showSaveError);
  };

  const handleSaveTransactionNote = (
    transactionId: string,
    note: string | null,
  ) => {
    void updateLocalTransactionNote(transactionId, activeSpace.id, note)
      .then(() => {
        setTransactions((current) =>
          current.map((item) =>
            item.id === transactionId
              ? { ...item, note: note ?? undefined }
              : item,
          ),
        );
        publishActiveCoupleChanges();
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
        publishCoupleSpaceChanges(targetSpaceId);
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
        publishCoupleSpaceChanges(targetSpaceId);
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
    <>
      <Drawer.Navigator
        drawerContent={({ navigation }) => (
          <SpaceSideMenu
            activeSpaceId={activeSpace.id}
            onClose={() => navigation.closeDrawer()}
            onCreateSpace={createSpace}
            onInvitePartner={() => {
              navigation.closeDrawer();
              handleInvitePartner();
            }}
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
                  (activeMainTab === 'Home' || activeMainTab === 'Activity') &&
                  hasMultipleVisibleCurrencies
                    ? getCurrencyFlag(effectiveHomeCurrency)
                    : undefined
                }
                onCurrencyPress={handleHomeCurrencyPress}
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
                  listeners={{
                    focus: () => {
                      setActiveMainTab('Home');
                      setHomeChartResetKey((key) => key + 1);
                    },
                  }}
                  name="Home"
                >
                  {({ navigation }) =>
                    isAwaitingPartner ? (
                      <AwaitingPartnerScreen
                        onCancelSpace={handleCancelPendingCoupleSpace}
                        onChangeInvitation={handleInvitePartner}
                        onRefresh={refreshCoupleSpaceAndData}
                        space={activeSpace}
                      />
                    ) : (
                      <HomeScreen
                        categories={activeSpaceCategories}
                        currency={effectiveHomeCurrency}
                        focusResetKey={homeChartResetKey}
                        onCreateCategory={() => handleCreateAction('category')}
                        onCreateExpense={() => handleCreateAction('expense')}
                        onCreateIncome={() => handleCreateAction('income')}
                        onCreateMovement={() => handleCreateAction('expense')}
                        onOpenCategoryDetail={(categoryId) =>
                          setDetailRequest({
                            categoryId,
                            displayCurrency: effectiveHomeCurrency,
                          })
                        }
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
                        spaceCurrency={activeSpace.currency}
                        topContent={
                          activeSpace.type === 'personal' ? (
                            <PendingInvitationBanner
                              onAccepted={refreshCoupleSpaceAndData}
                            />
                          ) : null
                        }
                        transactions={activeSpaceTransactions}
                      />
                    )
                  }
                </Tabs.Screen>
                <Tabs.Screen
                  listeners={{
                    blur: () => setActivitySummaryPinned(false),
                    focus: () => {
                      setActiveMainTab('Activity');
                      setActivityChartResetKey((key) => key + 1);
                    },
                  }}
                  name="Activity"
                >
                  {({ route }) => (
                    <ActivityScreen
                      categories={activeSpaceCategories}
                      currency={effectiveHomeCurrency}
                      focusResetKey={activityChartResetKey}
                      onCreateCategory={() => handleCreateAction('category')}
                      onCreateExpense={() => handleCreateAction('expense')}
                      onCreateIncome={() => handleCreateAction('income')}
                      onCreateMovement={() => handleCreateAction('expense')}
                      onOpenCategoryDetail={(categoryId, currency) =>
                        setDetailRequest({
                          categoryId,
                          displayCurrency: currency,
                        })
                      }
                      onOpenTransactionDetail={setDetailTransactionId}
                      onScrollDirectionChange={handleScrollDirectionChange}
                      onSummaryPinnedChange={setActivitySummaryPinned}
                      spaceCurrency={activeSpace.currency}
                      summaryPinned={isActivitySummaryPinned}
                      targetRequestId={route.params?.requestId}
                      targetSection={route.params?.section}
                      transactions={activeSpaceTransactions}
                      visibleCurrencies={visibleCurrencies}
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
                availableCurrencies={visibleCurrencies}
                initialDate={transactionInitialDate}
                initialDraft={editingTransaction ?? undefined}
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
                spaceCurrency={activeSpace.currency}
                type={transactionType}
                visible={isTransactionModalVisible}
              />
              <ImportScreen
                activeSpaceId={activeSpace.id}
                activeSpaceName={activeSpace.name}
                availableCurrencies={visibleCurrencies}
                categories={categories}
                existingTransactions={activeSpaceTransactions}
                fallbackCurrency={activeSpace.currency}
                onCategoriesCreated={(created) =>
                  setCategories((current) => [...current, ...created])
                }
                onClose={() => setImportVisible(false)}
                onImportComplete={(created) => {
                  let nextTransactions: SessionTransaction[] = [];
                  setTransactions((current) => {
                    nextTransactions = [...created, ...current];
                    return nextTransactions;
                  });
                  void reconcileNotificationRules({
                    categories,
                    transactions: nextTransactions,
                  }).catch(() => undefined);
                }}
                visible={isImportVisible}
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
              {detailRequest ? (
                <CategoryDetailModal
                  category={detailCategory}
                  displayCurrency={detailRequest.displayCurrency}
                  onAddTransaction={(categoryId) => {
                    setDetailRequest(null);
                    setTransactionInitialDate(undefined);
                    setSelectedCategoryId(categoryId);
                    setTransactionType('expense');
                    setTransactionModalVisible(true);
                  }}
                  onClose={() => setDetailRequest(null)}
                  onDelete={(categoryId) => {
                    setDetailRequest(null);
                    handleArchiveCategory(categoryId);
                  }}
                  onEdit={(categoryId) => {
                    setDetailRequest(null);
                    setEditingCategoryId(categoryId);
                    setCustomCategoryVisible(true);
                  }}
                  onOpenTransactionDetail={setDetailTransactionId}
                  onSaveBudget={handleSaveCategoryBudget}
                  onSaveNote={handleSaveCategoryNote}
                  onShare={handleShareCategory}
                  shareTargets={shareTargets}
                  spaceCurrency={activeSpace.currency}
                  transactions={activeSpaceTransactions}
                  visible={detailCategory !== null}
                />
              ) : null}
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
                onOpenCategoryDetail={(categoryId, currency) =>
                  setDetailRequest({
                    categoryId,
                    displayCurrency: currency,
                  })
                }
                onRemoveReminder={handleRemoveTransactionReminder}
                onSaveNote={handleSaveTransactionNote}
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
                currencies={visibleCurrencies}
                onClose={closeHomeCurrencyPicker}
                onSelect={selectHomeCurrency}
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
              activeSpaceType={activeSpace.type}
              currencyPreferences={currencyPreferences}
              notificationRules={activeSpaceNotificationRules}
              onBack={() => navigation.navigate('Main')}
              onDissolveCoupleSpace={async () => {
                await dissolveCoupleSpace();
                navigation.navigate('Main');
              }}
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
        <Drawer.Screen name="AcceptInvitation">
          {({ navigation, route }) => (
            <AcceptInvitationScreen
              onFinished={() => navigation.navigate('Main')}
              refreshCoupleSpace={refreshCoupleSpaceAndData}
              token={route.params.token}
            />
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
      <InvitePartnerScreen
        coupleSpace={coupleSpace}
        onClose={() => setInvitePartnerVisible(false)}
        onCreateCoupleSpace={createCoupleSpace}
        visible={isInvitePartnerVisible}
      />
      <AuthModal
        onClose={() => setSpaceAuthModalVisible(false)}
        visible={isSpaceAuthModalVisible}
      />
    </>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
}
