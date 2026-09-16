import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/feedback/LoadingState/LoadingState';
import { ActiveSpaceHeader } from '@/components/navigation/ActiveSpaceHeader/ActiveSpaceHeader';
import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import { AppTabBar } from '@/components/navigation/AppTabBar/AppTabBar';
import { NoticeToast } from '@/components/overlays/NoticeToast/NoticeToast';
import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
import { ActivityTabContent } from '@/navigation/components/ActivityTabContent';
import { HomeTabContent } from '@/navigation/components/HomeTabContent';
import {
  getHomeCurrencyButtonLabel,
  resolveHomeCurrencies,
  useHomeCurrencyPress,
} from '@/navigation/homeCurrencyControls';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import {
  CategoryPickerModal,
  type CategoryPickerSelection,
} from '@/features/categories/components/CategoryPickerModal/CategoryPickerModal';
import { CategoryDetailModal } from '@/features/categories/components/CategoryDetailModal/CategoryDetailModal';
import { CreateCategoryModal } from '@/features/categories/components/CreateCategoryModal/CreateCategoryModal';
import { MoneyAccountModals } from '@/features/accounts/components/MoneyAccountModals';
import { useMoneyAccounts } from '@/features/accounts/hooks/useMoneyAccounts';
import { moneyAccountSupportsCurrency } from '@/features/accounts/types';
import {
  createDefaultCategoryInputForSpace,
  type DefaultCategoryDefinition,
} from '@/features/categories/constants/defaultCategories';
import {
  archiveLocalCategory,
  createLocalCategories,
  createLocalCategory,
  updateLocalCategory,
  updateLocalCategoryNote,
} from '@/features/categories/repositories/localCategoryRepository';
import type {
  Category,
  CategoryEditorTarget,
  CreateCategoryInput,
} from '@/features/categories/types';
import {
  listCategoriesBySpace,
  validateCategoryName,
} from '@/features/categories/utils/categoryCatalog';
import { HomeCurrencyPickerModal } from '@/features/dashboard/components/HomeCurrencyPickerModal/HomeCurrencyPickerModal';
import { ImportScreen } from '@/features/import/screens/ImportScreen';
import {
  MapScreen,
  type MapScreenHandle,
} from '@/features/map/screens/MapScreen';
import { SettingsDrawerContent } from '@/navigation/components/SettingsDrawerContent';
import { useLocalDisplayName } from '@/features/profile/hooks/useLocalDisplayName';
import { useSpaceMemberAvatars } from '@/features/profile/hooks/useSpaceMemberAvatars';
import { useCurrencyCapabilities } from '@/features/profile/hooks/useCurrencyCapabilities';
import { SpaceMembershipProvider } from '@/features/profile/state/SpaceMembershipContext';
import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import { useCancelPendingInvitationAction } from '@/features/spaces/hooks/useCancelPendingInvitationAction';
import { useSpaceCurrencies } from '@/features/spaces/hooks/useSpaceCurrencies';
import { useCopyToSpace } from '@/features/spaces/hooks/useCopyToSpace';
import { useCoupleSpacePublisher } from '@/features/spaces/hooks/useCoupleSpacePublisher';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { AcceptInvitationScreen } from '@/features/spaces/screens/AcceptInvitationScreen';
import { isAwaitingPartnerSpace } from '@/features/spaces/types';
import { useFinanceSync } from '@/features/sync/hooks/useFinanceSync';
import { SyncIssueToast } from '@/features/sync/components/SyncIssueToast';
import { useSessionStartup } from '@/features/sync/hooks/useSessionStartup';
import { useCurrencyPreferences } from '@/state/appPreferences/useCurrencyPreferences';
import { useActivitySectionsPreference } from '@/state/appPreferences/useActivitySectionsPreference';
import { useHomeComparisonIndicatorsPreference } from '@/state/appPreferences/useHomeComparisonIndicatorsPreference';
import { useHomeCurrencySelection } from '@/state/appPreferences/useHomeCurrencySelection';
import { useSaveErrorAlert } from '@/navigation/useSaveErrorAlert';
import { CreateTransactionModal } from '@/features/transactions/components/CreateTransactionModal/CreateTransactionModal';
import { TransactionDetailModal } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailModal';
import type {
  CreateTransactionDraft,
  SessionTransaction,
  TransactionEditorTarget,
  TransactionNotificationRule,
  TransactionReminder,
  TransactionType,
} from '@/features/transactions/types';
import {
  archiveLocalTransaction,
  createLocalTransaction,
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
import { useTransactionEditing } from '@/features/transactions/hooks/useTransactionEditing';
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';
import { useAppForeground } from '@/hooks/useAppForeground';
import {
  defaultCurrencyCode,
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { triggerHaptic } from '@/lib/haptics/haptics';
import type { CreateActionType } from '@/navigation/createActions';
import type { MainTabParamList, RootDrawerParamList } from '@/navigation/types';
import { layout } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();
const drawerWidthRatio = 0.88,
  drawerMaxWidth = 380;

type CategoryCreationContext = 'quick' | 'transaction';
type CategoryDetailRequest = {
  categoryId: string;
  displayCurrency: CurrencyCode;
};

export function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const {
    activeSpace,
    cancelPendingCoupleInvitation,
    createCoupleSpaceInvitation,
    createSpace,
    leaveCoupleSpace,
    error: spacesError,
    isReady,
    refreshCoupleSpace,
    reloadSpaces,
    selectSpace,
    spaces,
  } = useSpaces();
  const { session } = useAuthSession();
  const localDisplayName = useLocalDisplayName();

  const userDisplayName =
    localDisplayName?.trim() || session?.user.name?.trim() || null;
  const activeSpaceName =
    activeSpace.type === 'personal' && userDisplayName
      ? userDisplayName
      : activeSpace.name;
  const displayedSpaces = useMemo(
    () =>
      userDisplayName
        ? spaces.map((s) =>
            s.type === 'personal' ? { ...s, name: userDisplayName } : s,
          )
        : spaces,
    [spaces, userDisplayName],
  );

  const [isInvitePartnerVisible, setInvitePartnerVisible] = useState(false);
  const coupleSpace = spaces.find((space) => space.type === 'couple') ?? null;
  const isAwaitingPartner = isAwaitingPartnerSpace(activeSpace);
  const areSpaceActionsBlocked = isAwaitingPartner || isInvitePartnerVisible;
  const spaceMemberAvatarUris = useSpaceMemberAvatars(activeSpace);
  const headerSpaceName = isInvitePartnerVisible
    ? (coupleSpace?.name ?? 'Juntos')
    : activeSpaceName;
  const headerMemberAvatarUris = isInvitePartnerVisible
    ? undefined
    : spaceMemberAvatarUris;
  const {
    activeCurrencies,
    preferences: currencyPreferences,
    reloadCurrencyPreferences,
    setCurrencyPreferences,
  } = useCurrencyPreferences();
  const { countryCode, venezuelaCurrencyMode } = useCurrencyCapabilities();
  const {
    selectedCurrency: selectedHomeCurrency,
    setSelectedCurrency: setSelectedHomeCurrency,
  } = useHomeCurrencySelection();
  const {
    enabled: showHomeComparisonIndicators,
    setEnabled: setShowHomeComparisonIndicators,
  } = useHomeComparisonIndicatorsPreference();
  const activitySections = useActivitySectionsPreference();
  const [activeMainTab, setActiveMainTab] = useState<
    'Home' | 'Activity' | 'Map'
  >('Home');
  const [homeChartResetKey, setHomeChartResetKey] = useState(0);
  const [activityChartResetKey, setActivityChartResetKey] = useState(0);
  const [isHomeCurrencyPickerVisible, setHomeCurrencyPickerVisible] =
    useState(false);
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
  const [transactionInitialEditor, setTransactionInitialEditor] = useState<
    TransactionEditorTarget | undefined
  >();
  const [transactions, setTransactions] = useState<SessionTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notificationRules, setNotificationRules] = useState<
    TransactionNotificationRule[]
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedMoneyAccountId, setSelectedMoneyAccountId] = useState<
    string | null
  >(null);
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [isCustomCategoryVisible, setCustomCategoryVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryInitialEditor, setCategoryInitialEditor] = useState<
    CategoryEditorTarget | undefined
  >();
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
  const categoryPickerMode =
    categoryCreationContext !== 'quick' && activeSpaceCategories.length > 0
      ? 'select'
      : 'create';
  const moneyAccountsController = useMoneyAccounts({
    activeSpaceId: activeSpace.id,
    categories: spaceCategories,
    onChangesPublished: () => publishActiveCoupleChanges(),
    onError: () => showSaveError(),
    onTransactionsCreated: (created) =>
      setTransactions((current) => [...created, ...current]),
    transactions,
  });
  const { setMoneyAccounts } = moneyAccountsController;
  const activeSpaceDataCurrencies = useMemo(() => {
    const set = new Set<CurrencyCode>();
    for (const transaction of activeSpaceTransactions) {
      if (isCurrencyCode(transaction.currency)) {
        set.add(transaction.currency);
      }
    }
    for (const account of moneyAccountsController.activeSpaceMoneyAccounts) {
      for (const balance of account.balances) {
        if (isCurrencyCode(balance.currency)) {
          set.add(balance.currency);
        }
      }
    }
    return Array.from(set);
  }, [
    activeSpaceTransactions,
    moneyAccountsController.activeSpaceMoneyAccounts,
  ]);
  // Incluye monedas de miembros, movimientos y cuentas del espacio compartido.
  const spaceCurrencies = useSpaceCurrencies(
    activeSpace,
    activeCurrencies,
    activeSpaceDataCurrencies,
  );
  const homeCurrencies = resolveHomeCurrencies(
    spaceCurrencies,
    venezuelaCurrencyMode,
  );
  const effectiveHomeCurrency =
    (selectedHomeCurrency && homeCurrencies.includes(selectedHomeCurrency)
      ? selectedHomeCurrency
      : homeCurrencies[0]) ?? defaultCurrencyCode;
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
  const { applyTransactionUpdate, quickEditTransaction } =
    useTransactionEditing({
      categories,
      onChangesPublished: () => publishActiveCoupleChanges(),
      onError: () => showSaveError(),
      setDetailTransactionId,
      setTransactions,
      spaceTransactions: activeSpaceTransactions,
    });
  const detailTransactionMoneyAccount = detailTransaction
    ? (moneyAccountsController.spaceMoneyAccounts.find(
        (account) => account.id === detailTransaction.moneyAccountId,
      ) ?? null)
    : null;
  /** Al abrir la cuenta desde detalle, conserva la regla de no cambiar moneda. */
  const transactionMoneyAccountOptions =
    transactionInitialEditor === 'money-account' && editingTransaction
      ? moneyAccountsController.activeSpaceMoneyAccounts.filter((account) =>
          moneyAccountSupportsCurrency(account, editingTransaction.currency),
        )
      : moneyAccountsController.activeSpaceMoneyAccounts;
  /** Misma regla para el selector que el detalle abre sobre sí mismo. */
  const detailMoneyAccountOptions = detailTransaction
    ? moneyAccountsController.activeSpaceMoneyAccounts.filter((account) =>
        moneyAccountSupportsCurrency(account, detailTransaction.currency),
      )
    : [];
  const {
    copyCategory: handleShareCategory,
    copyTransaction: handleCopyTransaction,
    dismissNotice: handleDismissCopyNotice,
    notice: copySuccessNotice,
  } = useCopyToSpace({
    activeSpaceId: activeSpace.id,
    categories,
    onCategoryCopied: (category) =>
      setCategories((current) => [...current, category]),
    onChangesPublished: (targetSpaceId) =>
      publishCoupleSpaceChanges(targetSpaceId),
    onError: () => showSaveError(),
    onTransactionsCopied: (copied) =>
      setTransactions((current) => [...current, ...copied]),
    spaces,
    transactions,
  });

  const { publishCoupleSpaceChanges, publishActiveCoupleChanges } =
    useCoupleSpacePublisher(session, spaces, activeSpace.id);

  const {
    refreshCoupleSpaceAndData,
    refreshFinancialContext,
    refreshSharedCoupleData,
    reloadLocalFinance,
  } = useFinanceSync({
    refreshCoupleSpace,
    reloadCurrencyPreferences,
    reloadSpaces,
    session,
    setCategories,
    setMoneyAccounts,
    setTransactions,
    spaces,
  });
  const { dismissSyncIssue, isFinanceReady, retrySession, syncIssue } =
    useSessionStartup({
      refreshSharedCoupleData,
      reloadLocalFinance,
      reloadSpaces,
      session,
      setNotificationRules,
    });

  useEffect(() => {
    const transactionId = detailTransaction?.id;
    if (!transactionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia junto al fetch con cleanup de abajo
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
    if (!isFinanceReady) return;
    void reconcileDailyReminder({ transactions }).catch(() => undefined);
  }, [isFinanceReady, transactions]);

  useAppForeground(() => {
    void reconcileNotificationRules({ categories, transactions }).catch(
      () => undefined,
    );
    void reconcileDailyReminder({ transactions }).catch(() => undefined);
    if (session) void refreshSharedCoupleData(undefined, { mode: 'delta' });
  });

  const showSaveError = useSaveErrorAlert();

  const handleHomeCurrencyPress = useHomeCurrencyPress({
    currencies: homeCurrencies,
    currentCurrency: effectiveHomeCurrency,
    onOpenPicker: () => setHomeCurrencyPickerVisible(true),
    onSaveError: showSaveError,
    setSelectedCurrency: setSelectedHomeCurrency,
  });

  const onCancel = useCancelPendingInvitationAction(
    cancelPendingCoupleInvitation,
  );

  const handleCreateAction = (action: CreateActionType) => {
    setCreateMenuVisible(false);

    if (action === 'income' || action === 'expense') {
      setEditingTransactionId(null);
      setTransactionInitialDate(undefined);
      setSelectedCategoryId(null);
      setSelectedMoneyAccountId(null);
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
    setCategoryInitialEditor(undefined);
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
        setCategoryInitialEditor(undefined);
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
    const targetCategory = categories.find(
      (category) => category.id === draft.categoryId,
    );
    if (!targetCategory) {
      console.error(
        '[MainTabsNavigator] La categoría seleccionada no existe:',
        draft.categoryId,
      );
      showSaveError();
      return;
    }

    const safeDraft: CreateTransactionDraft = {
      ...draft,
      spaceId: activeSpace.id,
    };

    if (safeDraft.moneyAccountId) {
      const account = moneyAccountsController.moneyAccounts.find(
        (candidate) => candidate.id === safeDraft.moneyAccountId,
      );
      if (
        account &&
        !moneyAccountSupportsCurrency(account, safeDraft.currency) &&
        !(await moneyAccountsController.ensureCurrency(
          safeDraft.moneyAccountId,
          safeDraft.currency,
        ))
      ) {
        console.error(
          '[MainTabsNavigator] No se pudo asegurar la moneda para la cuenta:',
          safeDraft.currency,
        );
        showSaveError();
        return;
      }
    }

    if (editingTransactionId) {
      const updated = await applyTransactionUpdate(
        editingTransactionId,
        safeDraft,
      );
      if (updated) {
        setEditingTransactionId(null);
        setTransactionInitialEditor(undefined);
        setTransactionInitialDate(undefined);
        setTransactionModalVisible(false);
        setSelectedCategoryId(null);
        setSelectedMoneyAccountId(null);
      }
      return;
    }

    try {
      const createdTransactions = await createLocalTransaction(safeDraft);
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
      setSelectedCategoryId(null);
      setSelectedMoneyAccountId(null);
    } catch (error) {
      console.error('[MainTabsNavigator] createLocalTransaction falló:', error);
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
    const source = transactions.find((t) => t.id === transactionId);
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

  const handleAcceptPendingInvitation = useCallback(
    async (acceptedSpaceId?: string) => {
      setInvitePartnerVisible(false);
      await refreshCoupleSpaceAndData();
      setActiveMainTab('Home');
      if (acceptedSpaceId)
        await selectSpace(acceptedSpaceId).catch(() => undefined);
    },
    [refreshCoupleSpaceAndData, selectSpace],
  );

  const content = (
    <SpaceMembershipProvider space={activeSpace}>
      <Drawer.Navigator
        drawerContent={({ navigation }) => (
          <SpaceSideMenu
            activeSpaceId={isInvitePartnerVisible ? '' : activeSpace.id}
            isInvitePartnerActive={isInvitePartnerVisible}
            onClose={() => navigation.closeDrawer()}
            onCreateSpace={createSpace}
            onInvitePartner={() => {
              navigation.closeDrawer();
              setActiveMainTab('Home');
              setActivitySummaryPinned(false);
              setCreateMenuVisible(false);
              setFloatingCreateButtonVisible(true);
              setInvitePartnerVisible(true);
              navigation.navigate('Main', { screen: 'Home' });
            }}
            onOpenSettings={() => navigation.navigate('Settings')}
            onSelectSpace={async (spaceId) => {
              setInvitePartnerVisible(false);
              const targetSpace = displayedSpaces.find((s) => s.id === spaceId);
              if (
                targetSpace?.type === 'couple' ||
                spaceId === coupleSpace?.id
              ) {
                setActiveMainTab('Home');
                setActivitySummaryPinned(false);
                setCreateMenuVisible(false);
                setFloatingCreateButtonVisible(true);
                navigation.navigate('Main', { screen: 'Home' });
              }
              await selectSpace(spaceId);
            }}
            spaces={displayedSpaces}
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
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Drawer.Screen name="Main">
          {({ navigation }) => (
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <ActiveSpaceHeader
                currencyFlag={
                  countryCode !== null &&
                  (activeMainTab === 'Home' || activeMainTab === 'Activity') &&
                  homeCurrencies.length > 1
                    ? getHomeCurrencyButtonLabel(
                        effectiveHomeCurrency,
                        venezuelaCurrencyMode,
                      )
                    : undefined
                }
                memberAvatarUris={headerMemberAvatarUris}
                onCurrencyPress={handleHomeCurrencyPress}
                onSpacePress={() => navigation.openDrawer()}
                spaceName={headerSpaceName}
                visible={
                  activeMainTab !== 'Activity' || !isActivitySummaryPinned
                }
              />
              <Tabs.Navigator
                initialRouteName="Home"
                key={
                  isInvitePartnerVisible
                    ? 'partner-invite'
                    : isAwaitingPartner
                      ? 'couple-pending'
                      : 'space-ready'
                }
                screenOptions={{ headerShown: false, animation: 'fade' }}
                tabBar={(props) => (
                  <AppTabBar
                    {...props}
                    disabledRoutes={
                      areSpaceActionsBlocked ? ['Activity', 'Map'] : undefined
                    }
                  />
                )}
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
                  {({ navigation }) => (
                    <HomeTabContent
                      activeSpace={activeSpace}
                      activeSpaceCategories={activeSpaceCategories}
                      activeSpaceTransactions={activeSpaceTransactions}
                      coupleSpace={coupleSpace}
                      createCoupleSpaceInvitation={createCoupleSpaceInvitation}
                      effectiveHomeCurrency={effectiveHomeCurrency}
                      focusResetKey={homeChartResetKey}
                      handleCreateAction={handleCreateAction}
                      handleScrollDirectionChange={handleScrollDirectionChange}
                      isAwaitingPartner={isAwaitingPartner}
                      isInvitePartnerVisible={isInvitePartnerVisible}
                      moneyAccounts={
                        moneyAccountsController.activeSpaceMoneyAccounts
                      }
                      navigateToActivitySection={(section) => {
                        activityRequestId.current += 1;
                        navigation.navigate('Activity', {
                          requestId: activityRequestId.current,
                          section,
                        });
                      }}
                      onCancelInvitation={onCancel}
                      onDismissInvitePartner={() =>
                        setInvitePartnerVisible(false)
                      }
                      onOpenCategoryDetail={(categoryId) =>
                        setDetailRequest({
                          categoryId,
                          displayCurrency: effectiveHomeCurrency,
                        })
                      }
                      onOpenCountrySettings={() =>
                        navigation.navigate('Settings')
                      }
                      onOpenCreateMoneyAccount={
                        moneyAccountsController.openCreation
                      }
                      onOpenMoneyAccountDetail={
                        moneyAccountsController.openDetail
                      }
                      onOpenTransactionDetail={setDetailTransactionId}
                      onAcceptPendingInvitation={handleAcceptPendingInvitation}
                      onRefreshCoupleSpaceAndData={refreshCoupleSpaceAndData}
                      onRequestInvitePartner={() =>
                        setInvitePartnerVisible(true)
                      }
                      showHomeComparisonIndicators={
                        showHomeComparisonIndicators
                      }
                    />
                  )}
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
                    <ActivityTabContent
                      categories={activeSpaceCategories}
                      currency={effectiveHomeCurrency}
                      focusResetKey={activityChartResetKey}
                      moneyAccounts={
                        moneyAccountsController.activeSpaceMoneyAccounts
                      }
                      onCreateAction={handleCreateAction}
                      onCreateMoneyAccount={
                        moneyAccountsController.openCreation
                      }
                      onImport={() => setImportVisible(true)}
                      onOpenCategoryDetail={(categoryId, currency) =>
                        setDetailRequest({
                          categoryId,
                          displayCurrency: currency ?? effectiveHomeCurrency,
                        })
                      }
                      onOpenMoneyAccountDetail={
                        moneyAccountsController.openDetail
                      }
                      onOpenTransactionDetail={setDetailTransactionId}
                      onScrollDirectionChange={handleScrollDirectionChange}
                      onSummaryPinnedChange={setActivitySummaryPinned}
                      preference={activitySections.preference}
                      savePreference={(preference) =>
                        void activitySections.setPreference(preference)
                      }
                      spaceCurrency={activeSpace.currency}
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
                        setSelectedMoneyAccountId(null);
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
                onPress={() => setCreateMenuVisible(!areSpaceActionsBlocked)}
                visible={
                  isFloatingCreateButtonVisible && !areSpaceActionsBlocked
                }
              />
              <QuickCreateMenu
                onClose={() => setCreateMenuVisible(false)}
                onSelect={handleCreateAction}
                visible={isCreateMenuVisible && !areSpaceActionsBlocked}
              />
              <CreateTransactionModal
                activeSpaceId={activeSpace.id}
                availableCurrencies={spaceCurrencies}
                initialDate={transactionInitialDate}
                initialDraft={editingTransaction ?? undefined}
                initialEditor={transactionInitialEditor}
                initialMoneyAccountId={selectedMoneyAccountId ?? undefined}
                moneyAccounts={transactionMoneyAccountOptions}
                onClose={() => {
                  setEditingTransactionId(null);
                  setTransactionInitialEditor(undefined);
                  setTransactionInitialDate(undefined);
                  setTransactionModalVisible(false);
                }}
                onCreateMoneyAccount={moneyAccountsController.openCreation}
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
                activeSpaceName={activeSpaceName}
                availableCurrencies={spaceCurrencies}
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
                initialEditor={categoryInitialEditor}
                onClose={() => {
                  setCustomCategoryVisible(false);
                  setEditingCategoryId(null);
                  setCategoryInitialEditor(undefined);
                }}
                onSubmit={handleCreateCategory}
                spaceId={activeSpace.id}
                spaceName={activeSpace.name}
                visible={isCustomCategoryVisible}
              />
              <CategoryDetailModal
                category={detailCategory}
                displayCurrency={
                  detailRequest?.displayCurrency ?? effectiveHomeCurrency
                }
                onAddTransaction={(categoryId) => {
                  setDetailRequest(null);
                  setTransactionInitialDate(undefined);
                  setSelectedCategoryId(categoryId);
                  setSelectedMoneyAccountId(null);
                  setTransactionType('expense');
                  setTransactionModalVisible(true);
                }}
                onClose={() => setDetailRequest(null)}
                onDelete={(categoryId) => {
                  setDetailRequest(null);
                  handleArchiveCategory(categoryId);
                }}
                onEdit={(categoryId, initialEditor) => {
                  setDetailRequest(null);
                  setEditingCategoryId(categoryId);
                  setCategoryInitialEditor(initialEditor);
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
              <MoneyAccountModals
                availableCurrencies={spaceCurrencies}
                categories={spaceCategories}
                controller={moneyAccountsController}
                onAddTransaction={(moneyAccountId) => {
                  setTransactionInitialDate(undefined);
                  setSelectedCategoryId(null);
                  setSelectedMoneyAccountId(moneyAccountId);
                  setTransactionType('expense');
                  setTransactionModalVisible(true);
                }}
                onOpenTransactionDetail={setDetailTransactionId}
                spaceId={activeSpace.id}
                spaceCurrency={activeSpace.currency}
                spaceName={activeSpace.name}
                transactions={activeSpaceTransactions}
              />
              <TransactionDetailModal
                assignableMoneyAccounts={detailMoneyAccountOptions}
                category={detailTransactionCategory}
                moneyAccount={detailTransactionMoneyAccount}
                onClose={() => setDetailTransactionId(null)}
                onCreateMoneyAccount={moneyAccountsController.openCreation}
                onCopy={handleCopyTransaction}
                onDelete={handleDeleteTransaction}
                onEdit={(transactionId, initialEditor) => {
                  const transaction = resolveTransactionForDetail(
                    activeSpaceTransactions,
                    transactionId,
                  );
                  if (!transaction) return;
                  setDetailTransactionId(null);
                  setEditingTransactionId(transaction.id);
                  setTransactionInitialEditor(initialEditor);
                  setTransactionInitialDate(undefined);
                  setSelectedCategoryId(transaction.categoryId);
                  setSelectedMoneyAccountId(null);
                  setTransactionType(transaction.type);
                  setTransactionModalVisible(true);
                }}
                onOpenCategoryDetail={(categoryId) => {
                  if (!detailTransaction) return;
                  setDetailRequest({
                    categoryId,
                    displayCurrency: detailTransaction.currency,
                  });
                }}
                onQuickEdit={quickEditTransaction}
                onRemoveReminder={handleRemoveTransactionReminder}
                onSaveNote={handleSaveTransactionNote}
                onSaveReminder={handleSaveTransactionReminder}
                reminder={detailTransactionReminder}
                shareTargets={shareTargets}
                transaction={detailTransaction}
                transactions={activeSpaceTransactions}
                visible={detailTransaction !== null}
              />
              <NoticeToast
                notice={copySuccessNotice}
                onDismiss={handleDismissCopyNotice}
                testID="copy-success-toast"
              />
              <SyncIssueToast
                issue={syncIssue}
                onDismiss={dismissSyncIssue}
                onRetry={retrySession}
              />
              <HomeCurrencyPickerModal
                currencies={homeCurrencies}
                onClose={() => setHomeCurrencyPickerVisible(false)}
                onSelect={(currency) => {
                  setHomeCurrencyPickerVisible(false);
                  setSelectedHomeCurrency(currency).catch(showSaveError);
                }}
                selectedCurrency={effectiveHomeCurrency}
                visible={isHomeCurrencyPickerVisible && !venezuelaCurrencyMode}
              />
            </View>
          )}
        </Drawer.Screen>
        <Drawer.Screen name="Settings" options={{ swipeEnabled: false }}>
          {({ navigation }) => (
            <SettingsDrawerContent
              activeSpaceId={activeSpace.id}
              activeSpaceType={activeSpace.type}
              currencyPreferences={currencyPreferences}
              hasSharedSpace={
                coupleSpace !== null && !coupleSpace.isAwaitingPartner
              }
              notificationRules={activeSpaceNotificationRules}
              onBack={() => navigation.navigate('Main', { screen: 'Home' })}
              onLeaveCoupleSpace={async () => {
                await leaveCoupleSpace();
                navigation.navigate('Main');
              }}
              onCountryChanged={refreshFinancialContext}
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
              onOpenCountrySettings={() => navigation.navigate('Settings')}
              refreshCoupleSpace={refreshCoupleSpaceAndData}
              token={route.params.token}
            />
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </SpaceMembershipProvider>
  );

  return (
    <LoadingState loading={!isReady || !isFinanceReady} testID="spaces-loading">
      {content}
    </LoadingState>
  );
}
