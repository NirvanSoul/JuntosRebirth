import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { ActiveSpaceHeader } from '@/components/navigation/ActiveSpaceHeader/ActiveSpaceHeader';
import { getMapHeaderInset } from '@/features/map/components/MapFilterButton';
import { QuickCreateMenu } from '@/components/overlays/QuickCreateMenu/QuickCreateMenu';
import { ActivityTabContent } from '@/navigation/components/ActivityTabContent';
import { HomeTabContent } from '@/navigation/components/HomeTabContent';
import { MainAppTabBar } from '@/navigation/components/MainAppTabBar';
import { ComingSoonScreen } from '@/features/comingSoon/ComingSoonScreen';
import { useTransactionDetailModal } from '@/navigation/useTransactionDetailModal';
import {
  getHeaderCurrencyFlag,
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
import { saveLocalCategoryBudget } from '@/features/categories/repositories/localCategoryBudgetRepository';
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
import { CurrencyExchangeModal } from '@/features/exchangeRates/components/CurrencyExchangeModal/CurrencyExchangeModal';
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
import { useCancelPendingInvitationAction } from '@/features/spaces/hooks/useCancelPendingInvitationAction';
import { useSpaceCurrencies } from '@/features/spaces/hooks/useSpaceCurrencies';
import {
  filterByVisibleCurrencies,
  filterMoneyAccountsByVisibleCurrencies,
} from '@/features/spaces/utils/spaceCurrencies';
import { useCopyToSpace } from '@/features/spaces/hooks/useCopyToSpace';
import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import { useCoupleSpacePublisher } from '@/features/spaces/hooks/useCoupleSpacePublisher';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { AcceptInvitationScreen } from '@/features/spaces/screens/AcceptInvitationScreen';
import { isAwaitingPartnerSpace } from '@/features/spaces/types';
import { useFinanceSync } from '@/features/sync/hooks/useFinanceSync';
import { SessionStartupGate } from '@/features/sync/components/SessionStartupGate';
import { SyncIssueToast } from '@/features/sync/components/SyncIssueToast';
import { useSessionStartup } from '@/features/sync/hooks/useSessionStartup';
import { useCurrencyPreferences } from '@/state/appPreferences/useCurrencyPreferences';
import { useActivitySectionsPreference } from '@/state/appPreferences/useActivitySectionsPreference';
import { useHomeComparisonIndicatorsPreference } from '@/state/appPreferences/useHomeComparisonIndicatorsPreference';
import { useHomeCurrencySelection } from '@/state/appPreferences/useHomeCurrencySelection';
import { PreviewActionsLayer } from '@/navigation/components/PreviewActionsLayer';
import { resolvePreviewItemActions } from '@/navigation/previewItemActions';
import { useDetailTransactionReminder } from '@/navigation/useDetailTransactionReminder';
import { useSaveErrorAlert } from '@/navigation/useSaveErrorAlert';
import { NotificationsBellButton } from '@/features/notifications/components/NotificationsBellButton';
import { CreateTransactionModal } from '@/features/transactions/components/CreateTransactionModal/CreateTransactionModal';
import { MovementNoticeToast } from '@/features/transactions/components/MovementNoticeToast/MovementNoticeToast';
import { TransactionDetailModal } from '@/features/transactions/components/TransactionDetailModal/TransactionDetailModal';
import type {
  SessionTransaction,
  TransactionEditorTarget,
  TransactionNotificationRule,
  TransactionType,
} from '@/features/transactions/types';
import {
  archiveLocalTransaction,
  listLocalTransactions,
  updateLocalTransactionNote,
} from '@/features/transactions/repositories/localTransactionRepository';
import {
  listLocalNotificationRules,
  saveLocalNotificationRule,
  type SaveLocalNotificationRuleInput,
} from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import { reconcileDailyReminder } from '@/features/transactions/services/dailyReminderService';
import { reconcileNotificationRules } from '@/features/transactions/services/notificationRuleService';
import { cancelTransactionReminder } from '@/features/transactions/services/transactionReminderService';
import { useMovementNotice } from '@/features/transactions/hooks/useMovementNotice';
import { useTransactionEditing } from '@/features/transactions/hooks/useTransactionEditing';
import { useTransactionSubmit } from '@/features/transactions/hooks/useTransactionSubmit';
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';
import { indexCopiedTransactionSpaces } from '@/features/transactions/utils/transactionCopyIdentity';
import { useAppForeground } from '@/hooks/useAppForeground';
import { useStableCallback } from '@/hooks/useStableCallback';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { triggerHaptic } from '@/lib/haptics/haptics';
import type { CreateActionType } from '@/navigation/createActions';
import type * as Routes from '@/navigation/types';
import { useTheme } from '@/theme/useTheme';

const Tabs = createBottomTabNavigator<Routes.MainTabParamList>();
const Drawer = createDrawerNavigator<Routes.RootDrawerParamList>();
const drawerWidthRatio = 0.88,
  drawerMaxWidth = 380;
const mainSceneStyle = { flex: 1, backgroundColor: 'transparent' } as const;

type CategoryCreationContext = 'quick' | 'transaction' | 'detail';

export function MainTabsNavigator() {
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
  const { session, userId } = useAuthSession();
  const localDisplayName = useLocalDisplayName();

  const userDisplayName =
    localDisplayName?.trim() || session?.user.name?.trim() || null;
  const activeSpaceName =
    activeSpace.type === 'personal' ? 'Personal' : activeSpace.name;

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
  const [activeMainTab, setActiveMainTab] =
    useState<keyof Routes.MainTabParamList>('Home');
  const [homeChartResetKey, setHomeChartResetKey] = useState(0);
  const [activityChartResetKey, setActivityChartResetKey] = useState(0);
  const [isHomeCurrencyPickerVisible, setHomeCurrencyPickerVisible] =
    useState(false);
  const [isActivitySummaryPinned, setActivitySummaryPinned] = useState(false);
  const [isCreateMenuVisible, setCreateMenuVisible] = useState(false);
  const [isImportVisible, setImportVisible] = useState(false);
  const [isCurrencyExchangeVisible, setCurrencyExchangeVisible] =
    useState(false);
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
    useState<Routes.CategoryDetailRequest | null>(null);
  /** La solicitud se conserva mientras la hoja termina de cerrarse. */
  const [isCategoryDetailVisible, setCategoryDetailVisible] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [categoryCreationContext, setCategoryCreationContext] =
    useState<CategoryCreationContext | null>(null);
  const activityRequestId = useRef(0);
  const mapScreenRef = useRef<MapScreenHandle>(null);
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
    onArchived: () => announceDeleted('moneyAccount'),
    onCreated: (account) => announceCreatedMoneyAccount(account),
    onChangesPublished: () => publishActiveCoupleChanges(),
    onError: () => showSaveError(),
    onTransactionsCreated: (created) =>
      setTransactions((current) => [...created, ...current]),
    transactions,
  });
  const {
    category: detailTransactionCategory,
    close: closeTransactionDetail,
    closeThenRun: closeTransactionDetailThenRun,
    handleDismissed: handleTransactionDetailDismissed,
    moneyAccount: detailTransactionMoneyAccount,
    moneyAccountOptions: detailMoneyAccountOptions,
    open: openTransactionDetail,
    setTransactionId: setDetailTransactionId,
    transaction: detailTransaction,
    visible: isTransactionDetailVisible,
  } = useTransactionDetailModal({
    assignableMoneyAccounts: moneyAccountsController.accountSummaries,
    categories: spaceCategories,
    moneyAccounts: moneyAccountsController.spaceMoneyAccounts,
    transactions: activeSpaceTransactions,
  });
  const { setMoneyAccounts } = moneyAccountsController;
  // En un espacio compartido, lo que registran los demás sigue visible aunque
  // su moneda no esté entre las propias; lo propio solo en monedas activas.
  const spaceCurrencies = useSpaceCurrencies(
    activeSpace,
    activeCurrencies,
    userId,
    activeSpaceTransactions,
  );
  // Moneda propuesta al crear: la primera activa de la persona. La moneda con
  // la que nació el espacio puede ser el EUR por defecto del catálogo (se
  // siembra antes de elegir país) y no debe aparecer si nadie la activó.
  const entryCurrency = spaceCurrencies[0] ?? activeSpace.currency;
  const homeCurrencies = resolveHomeCurrencies(
    spaceCurrencies,
    venezuelaCurrencyMode,
  );
  // Quitar una moneda en Ajustes la oculta sin borrar nada: sus movimientos y
  // saldos siguen guardados y reaparecen al reactivarla.
  const visibleCurrencies = useMemo(
    () => new Set<string>([...spaceCurrencies, ...homeCurrencies]),
    [homeCurrencies, spaceCurrencies],
  );
  const visibleSpaceTransactions = useMemo(
    () => filterByVisibleCurrencies(activeSpaceTransactions, visibleCurrencies),
    [activeSpaceTransactions, visibleCurrencies],
  );
  const visibleSpaceMoneyAccounts = useMemo(
    () =>
      filterMoneyAccountsByVisibleCurrencies(
        moneyAccountsController.activeSpaceMoneyAccounts,
        visibleCurrencies,
      ),
    [moneyAccountsController.activeSpaceMoneyAccounts, visibleCurrencies],
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
  const editingTransaction = resolveTransactionForDetail(
    activeSpaceTransactions,
    editingTransactionId,
  );
  const shareTargets = spaces
    .filter((space) => space.id !== activeSpace.id)
    .map((space) => ({ id: space.id, name: space.name }));
  const copiedSpaceIds = useMemo(
    () => indexCopiedTransactionSpaces(transactions),
    [transactions],
  );
  const { applyTransactionUpdate, quickEditTransaction: quickEditLatest } =
    useTransactionEditing({
      categories,
      onChangesPublished: () => publishActiveCoupleChanges(),
      onError: () => showSaveError(),
      setDetailTransactionId,
      setTransactions,
      spaceTransactions: activeSpaceTransactions,
    });
  const {
    announce: announceMovement,
    announceCreatedMoneyAccount,
    announceDeleted,
    announceSaved: announceSavedMovement,
    dismissNotice: handleDismissMovementNotice,
    notice: movementNotice,
  } = useMovementNotice(openTransactionDetail);
  const {
    copyCategory: copyCategoryLatest,
    copyTransaction: copyTransactionLatest,
  } = useCopyToSpace({
    activeSpaceId: activeSpace.id,
    announce: announceMovement,
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
  const sessionStartup = useSessionStartup({
    refreshSharedCoupleData,
    reloadCurrencyPreferences,
    reloadLocalFinance,
    reloadSpaces,
    session,
    setNotificationRules,
  });
  const { dismissSyncIssue, isFinanceReady, retrySession, syncIssue } =
    sessionStartup;

  const {
    clearReminder: clearDetailTransactionReminder,
    reminder: detailTransactionReminder,
    removeReminder: handleRemoveTransactionReminder,
    saveReminder: handleSaveTransactionReminder,
  } = useDetailTransactionReminder({
    activeSpaceId: activeSpace.id,
    detailTransactionId: detailTransaction?.id,
    spaceCategories,
    transactions,
  });

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
      setCategoryCreationContext(null);
      setCategoryPickerVisible(false);
      openTransactionCreation({ type: action });
      return;
    }

    if (action === 'import') {
      setImportVisible(true);
      return;
    }

    if (action === 'currency-exchange') {
      setCurrencyExchangeVisible(true);
      return;
    }

    openCategoryPicker('quick');
  };

  const openCategoryDetail = (
    categoryId: string,
    displayCurrency: CurrencyCode = entryCurrency,
    author?: Routes.CategoryDetailRequest['author'],
  ) => {
    setDetailRequest({ author, categoryId, displayCurrency });
    setCategoryDetailVisible(true);
  };

  /** Prepara la hoja de creación con el contexto desde el que se pidió. */
  const openTransactionCreation = (options?: {
    categoryId?: string;
    date?: string;
    moneyAccountId?: string;
    type?: TransactionType;
  }) => {
    setEditingTransactionId(null);
    setTransactionInitialDate(options?.date);
    setSelectedCategoryId(options?.categoryId ?? null);
    setSelectedMoneyAccountId(options?.moneyAccountId ?? null);
    setTransactionType(options?.type ?? 'expense');
    setTransactionModalVisible(true);
  };

  const openCategoryPicker = (context: CategoryCreationContext) => {
    setCategoryCreationContext(context);
    setCategoryPickerVisible(true);
  };

  const closeCategoryPicker = () => {
    setCategoryPickerVisible(false);
    setCategoryCreationContext(null);
  };

  const pickCategory = (categoryId: string) => {
    if (categoryCreationContext === 'transaction') {
      setSelectedCategoryId(categoryId);
    } else if (categoryCreationContext === 'detail' && detailTransaction) {
      void quickEditTransaction(detailTransaction.id, {
        categoryId,
        field: 'category',
      });
    }
    closeCategoryPicker();
  };

  const finishCategoryCreation = (category: Category) => {
    setCategories((current) => [...current, category]);
    pickCategory(category.id);

    setCustomCategoryVisible(false);
    setEditingCategoryId(null);
    setCategoryInitialEditor(undefined);
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
    pickCategory(selection.categoryId);
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
      pickCategory(createdCategories[0]!.id);
    } catch {
      showSaveError();
    }
  };

  const { submitCurrencyExchange, submitTransaction: submitTransactionLatest } =
    useTransactionSubmit({
      activeSpaceId: activeSpace.id,
      applyTransactionUpdate,
      categories,
      editingTransactionId,
      ensureCurrency: moneyAccountsController.ensureCurrency,
      moneyAccounts: moneyAccountsController.moneyAccounts,
      onCategoriesCreated: (created) =>
        setCategories((current) => [...current, ...created]),
      onChangesPublished: () => publishActiveCoupleChanges(),
      onError: () => showSaveError(),
      onTransactionSaved: (mode) => {
        if (mode === 'updated') {
          setEditingTransactionId(null);
          setTransactionInitialEditor(undefined);
        }
        setTransactionInitialDate(undefined);
        setTransactionModalVisible(false);
        setSelectedCategoryId(null);
        setSelectedMoneyAccountId(null);
      },
      onTransactionsSaved: announceSavedMovement,
      setTransactions,
    });
  // Estos hooks no pasan por React Compiler (sus `try/catch` lo impiden):
  // se fijan aquí para que las hojas cerradas no se repinten con cada cambio.
  const submitTransaction = useStableCallback(submitTransactionLatest);
  const quickEditTransaction = useStableCallback(quickEditLatest);
  const handleShareCategory = useStableCallback(copyCategoryLatest);
  // Tras copiar se cierra el detalle para dejar a la vista la confirmación.
  const handleCopyTransaction = useStableCallback(
    async (ids: string | readonly string[], targetSpaceId: string) => {
      const copied = await copyTransactionLatest(ids, targetSpaceId);
      if (copied) closeTransactionDetail();
      return copied;
    },
  );

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await archiveLocalTransaction(transactionId, activeSpace.id);
      const nextTransactions = await listLocalTransactions();
      setTransactions(() => nextTransactions);
      closeTransactionDetail();
      clearDetailTransactionReminder();
      void cancelTransactionReminder(transactionId).catch(() => undefined);
      void reconcileNotificationRules({
        categories,
        transactions: nextTransactions,
      }).catch(() => undefined);
      publishActiveCoupleChanges();
      announceDeleted('transaction');
    } catch {
      showSaveError();
    }
  };

  /** Abre la hoja de edición del movimiento, desde el detalle o una tarjeta. */
  const startTransactionEdit = (
    transaction: SessionTransaction,
    initialEditor?: TransactionEditorTarget,
  ) => {
    openTransactionCreation({
      categoryId: transaction.categoryId,
      type: transaction.type,
    });
    setEditingTransactionId(transaction.id);
    setTransactionInitialEditor(initialEditor);
  };
  const startCategoryEdit = (
    categoryId: string,
    initialEditor?: CategoryEditorTarget,
  ) => {
    setEditingCategoryId(categoryId);
    setCategoryInitialEditor(initialEditor);
    setCustomCategoryVisible(true);
  };

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
      announceDeleted('category');
    } catch {
      showSaveError();
    }
  };

  const handleSaveCategoryBudget = (
    category: Category,
    currency: CurrencyCode,
  ) =>
    saveLocalCategoryBudget(category, currency)
      .then((updated) => {
        setCategories((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        publishActiveCoupleChanges();
      })
      .catch(showSaveError);

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

  // Pestañas y hojas se construyen fuera de la escena del drawer: así sus
  // elementos se memoizan y abrir o cerrar una hoja no vuelve a pintar las
  // pestañas ni las demás hojas.
  const mainTabs = (
    <Tabs.Navigator
      initialRouteName="Home"
      key={
        isInvitePartnerVisible
          ? 'partner-invite'
          : isAwaitingPartner
            ? 'couple-pending'
            : 'space-ready'
      }
      // Solo se pinta la pestaña visible: al cambiar de espacio, las demás se
      // ponen al día cuando se vuelve a ellas en vez de retrasar el cambio.
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        freezeOnBlur: true,
      }}
      tabBar={(props) => (
        <MainAppTabBar
          {...props}
          createDisabled={areSpaceActionsBlocked}
          onCreatePress={() => setCreateMenuVisible(true)}
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
            activeSpaceTransactions={visibleSpaceTransactions}
            coupleSpace={coupleSpace}
            createCoupleSpaceInvitation={createCoupleSpaceInvitation}
            effectiveHomeCurrency={effectiveHomeCurrency}
            focusResetKey={homeChartResetKey}
            handleCreateAction={handleCreateAction}
            isAwaitingPartner={isAwaitingPartner}
            isInvitePartnerVisible={isInvitePartnerVisible}
            moneyAccounts={visibleSpaceMoneyAccounts}
            navigateToActivitySection={(section) => {
              activityRequestId.current += 1;
              navigation.navigate('Activity', {
                requestId: activityRequestId.current,
                section,
              });
            }}
            onCancelInvitation={onCancel}
            onDismissInvitePartner={() => setInvitePartnerVisible(false)}
            onOpenCategoryDetail={(categoryId) =>
              openCategoryDetail(categoryId, effectiveHomeCurrency)
            }
            onOpenCountrySettings={() => navigation.navigate('Settings')}
            onOpenCreateMoneyAccount={moneyAccountsController.openCreation}
            onOpenMoneyAccountDetail={moneyAccountsController.openDetail}
            onOpenTransactionDetail={openTransactionDetail}
            onAcceptPendingInvitation={handleAcceptPendingInvitation}
            onRefreshCoupleSpaceAndData={refreshCoupleSpaceAndData}
            onRequestInvitePartner={() => setInvitePartnerVisible(true)}
            showHomeComparisonIndicators={showHomeComparisonIndicators}
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
            moneyAccounts={visibleSpaceMoneyAccounts}
            onCreateAction={handleCreateAction}
            onCreateMoneyAccount={moneyAccountsController.openCreation}
            onImport={() => setImportVisible(true)}
            onOpenCategoryDetail={(categoryId, currency, author) =>
              openCategoryDetail(
                categoryId,
                currency ?? effectiveHomeCurrency,
                author,
              )
            }
            onOpenMoneyAccountDetail={moneyAccountsController.openDetail}
            onOpenTransactionDetail={openTransactionDetail}
            onSummaryPinnedChange={setActivitySummaryPinned}
            preference={activitySections.preference}
            savePreference={(preference) =>
              void activitySections.setPreference(preference)
            }
            summaryPinned={isActivitySummaryPinned}
            targetRequestId={route.params?.requestId}
            targetSection={route.params?.section}
            transactions={visibleSpaceTransactions}
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
            currency={effectiveHomeCurrency}
            onAddTransaction={(date, type) =>
              openTransactionCreation({ date, type })
            }
            onOpenTransactionDetail={openTransactionDetail}
            ref={mapScreenRef}
            transactions={visibleSpaceTransactions}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        component={ComingSoonScreen}
        listeners={{ focus: () => setActiveMainTab('ComingSoon') }}
        name="ComingSoon"
      />
    </Tabs.Navigator>
  );

  const mainModals = (
    <>
      <QuickCreateMenu
        chainSelectionAfterDismiss
        onClose={() => setCreateMenuVisible(false)}
        onSelect={handleCreateAction}
        showCurrencyExchange={venezuelaCurrencyMode}
        visible={isCreateMenuVisible && !areSpaceActionsBlocked}
      />
      <CreateTransactionModal
        activeSpaceId={activeSpace.id}
        availableCurrencies={spaceCurrencies}
        initialDate={transactionInitialDate}
        initialDraft={editingTransaction ?? undefined}
        initialEditor={transactionInitialEditor}
        initialMoneyAccountId={selectedMoneyAccountId ?? undefined}
        moneyAccounts={moneyAccountsController.accountSummaries}
        onClose={() => {
          setEditingTransactionId(null);
          setTransactionInitialEditor(undefined);
          setTransactionInitialDate(undefined);
          setTransactionModalVisible(false);
        }}
        onCreateMoneyAccount={moneyAccountsController.openCreation}
        onOpenCategoryPicker={() => openCategoryPicker('transaction')}
        onSubmit={submitTransaction}
        onTypeChange={setTransactionType}
        selectedCategory={selectedCategory}
        spaceCurrency={entryCurrency}
        type={transactionType}
        visible={isTransactionModalVisible}
      />
      <CurrencyExchangeModal
        moneyAccounts={moneyAccountsController.accountSummaries}
        onClose={() => setCurrencyExchangeVisible(false)}
        onSubmit={async (submission) => {
          const saved = await submitCurrencyExchange(submission);
          if (saved) setCurrencyExchangeVisible(false);
          return saved;
        }}
        visible={isCurrencyExchangeVisible && venezuelaCurrencyMode}
      />
      <ImportScreen
        activeSpaceId={activeSpace.id}
        activeSpaceName={activeSpaceName}
        availableCurrencies={spaceCurrencies}
        categories={categories}
        existingTransactions={activeSpaceTransactions}
        fallbackCurrency={entryCurrency}
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
        selectedCategoryId={
          categoryCreationContext === 'detail'
            ? (detailTransaction?.categoryId ?? null)
            : selectedCategoryId
        }
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
        initialAuthor={detailRequest?.author}
        onAddTransaction={(categoryId) => {
          setCategoryDetailVisible(false);
          openTransactionCreation({ categoryId });
        }}
        onClose={() => setCategoryDetailVisible(false)}
        onDelete={(categoryId) => {
          setCategoryDetailVisible(false);
          handleArchiveCategory(categoryId);
        }}
        onEdit={(categoryId, initialEditor) => {
          setCategoryDetailVisible(false);
          startCategoryEdit(categoryId, initialEditor);
        }}
        onOpenTransactionDetail={openTransactionDetail}
        onSaveBudget={handleSaveCategoryBudget}
        onSaveNote={handleSaveCategoryNote}
        onShare={handleShareCategory}
        shareTargets={shareTargets}
        transactions={visibleSpaceTransactions}
        visible={isCategoryDetailVisible && detailCategory !== null}
      />
      <MoneyAccountModals
        availableCurrencies={spaceCurrencies}
        categories={spaceCategories}
        controller={moneyAccountsController}
        onAddTransaction={(moneyAccountId) =>
          openTransactionCreation({ moneyAccountId })
        }
        onOpenTransactionDetail={openTransactionDetail}
        spaceId={activeSpace.id}
        spaceCurrency={entryCurrency}
        spaceName={activeSpace.name}
        transactions={activeSpaceTransactions}
      />
      <TransactionDetailModal
        assignableMoneyAccounts={detailMoneyAccountOptions}
        category={detailTransactionCategory}
        copiedSpaceIds={copiedSpaceIds}
        moneyAccount={detailTransactionMoneyAccount}
        onClose={closeTransactionDetail}
        onCreateMoneyAccount={moneyAccountsController.openCreationFor}
        onCopy={handleCopyTransaction}
        onDelete={handleDeleteTransaction}
        onEdit={(transactionId, initialEditor) => {
          const transaction = resolveTransactionForDetail(
            activeSpaceTransactions,
            transactionId,
          );
          if (!transaction) return;
          closeTransactionDetailThenRun(() =>
            startTransactionEdit(transaction, initialEditor),
          );
        }}
        onOpenCategory={(id) =>
          closeTransactionDetailThenRun(() => openCategoryDetail(id))
        }
        onOpenCategoryPicker={() => openCategoryPicker('detail')}
        onQuickEdit={quickEditTransaction}
        onRemoveReminder={handleRemoveTransactionReminder}
        onSaveNote={handleSaveTransactionNote}
        onSaveReminder={handleSaveTransactionReminder}
        reminder={detailTransactionReminder}
        shareTargets={shareTargets}
        transaction={detailTransaction}
        transactions={activeSpaceTransactions}
        visible={isTransactionDetailVisible}
        onDismissed={handleTransactionDetailDismissed}
      />
      <MovementNoticeToast
        notice={movementNotice}
        onDismiss={handleDismissMovementNotice}
        testID="movement-notice-toast"
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
    </>
  );

  const content = (
    <SpaceMembershipProvider space={activeSpace}>
      {/* Envuelve también el menú lateral: sus modales usan la pulsación larga. */}
      <PreviewActionsLayer
        resolveActions={(target) =>
          resolvePreviewItemActions(target, {
            categories: spaceCategories,
            copiedSpaceIds,
            moneyAccounts: moneyAccountsController.activeSpaceMoneyAccounts,
            onArchiveCategory: handleArchiveCategory,
            onArchiveMoneyAccount: moneyAccountsController.archive,
            onCopyCategory: handleShareCategory,
            onCopyTransaction: handleCopyTransaction,
            onDeleteTransaction: handleDeleteTransaction,
            onEditCategory: startCategoryEdit,
            onEditMoneyAccount: moneyAccountsController.startEditing,
            onEditTransaction: startTransactionEdit,
            shareTargets,
            transactions: activeSpaceTransactions,
          })
        }
      >
        <Drawer.Navigator
          drawerContent={({ navigation }) => (
            <SpaceSideMenu
              activeSpaceId={isInvitePartnerVisible ? '' : activeSpace.id}
              isInvitePartnerActive={isInvitePartnerVisible}
              onClose={() => navigation.closeDrawer()}
              onCreateSpace={createSpace}
              onInvitePartner={() => {
                setActiveMainTab('Home');
                setActivitySummaryPinned(false);
                setCreateMenuVisible(false);
                setInvitePartnerVisible(true);
                navigation.navigate('Main', { screen: 'Home' });
              }}
              onOpenSettings={() => navigation.navigate('Settings')}
              onSelectSpace={async (spaceId) => {
                setInvitePartnerVisible(false);
                const target = spaces.find((s) => s.id === spaceId);
                if (target?.type === 'couple' || spaceId === coupleSpace?.id) {
                  setActiveMainTab('Home');
                  setActivitySummaryPinned(false);
                  setCreateMenuVisible(false);
                  navigation.navigate('Main', { screen: 'Home' });
                }
                await selectSpace(spaceId);
              }}
              profileAvatarUri={spaceMemberAvatarUris[0]}
              profileName={userDisplayName}
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
            sceneStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Drawer.Screen name="Main">
            {({ navigation }) => (
              <View style={mainSceneStyle}>
                <ActiveSpaceHeader
                  currencyFlag={getHeaderCurrencyFlag(
                    activeMainTab,
                    effectiveHomeCurrency,
                    homeCurrencies,
                    { countryCode, venezuelaCurrencyMode },
                  )}
                  memberAvatarUris={headerMemberAvatarUris}
                  onCurrencyPress={handleHomeCurrencyPress}
                  onSpacePress={() => navigation.openDrawer()}
                  spaceName={headerSpaceName}
                  trailingAction={
                    <NotificationsBellButton
                      activeSpaceId={activeSpace.id}
                      categories={categories}
                      onOpenTransaction={openTransactionDetail}
                      onSelectSpace={selectSpace}
                      spaces={spaces}
                      transactions={transactions}
                    />
                  }
                  trailingInset={getMapHeaderInset(activeMainTab)}
                  visible={
                    activeMainTab !== 'Activity' || !isActivitySummaryPinned
                  }
                />
                {mainTabs}
                {mainModals}
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
      </PreviewActionsLayer>
    </SpaceMembershipProvider>
  );

  return (
    <SessionStartupGate isReady={isReady} startup={sessionStartup}>
      {content}
    </SessionStartupGate>
  );
}
