import Svg, { Path, Rect } from 'react-native-svg';

import {
  type CopyTarget,
  maxStackedCopyItems,
} from '@/components/overlays/CopyToSpaceModal/CopyToSpaceModal';
import {
  DetailDeleteIcon,
  DetailEditIcon,
} from '@/components/overlays/DetailActionMenu/DetailActionIcons';
import type {
  PreviewAction,
  PreviewActionSubject,
} from '@/components/overlays/PreviewActions/previewActions';
import type { MoneyAccount } from '@/features/accounts/types';
import { moneyAccountDeletionCopy } from '@/features/accounts/utils/moneyAccountActionCopy';
import {
  getCategoryCopyItem,
  getCategoryCopyRequest,
} from '@/features/categories/components/CategoryIcon/categoryCopyItem';
import type { Category } from '@/features/categories/types';
import { categoryDeletionCopy } from '@/features/categories/utils/categoryActionCopy';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  getTransactionDeletionCopy,
  getTransactionsDeletionCopy,
  transactionCopyToSpaceCopy,
  transactionsCopyToSpaceCopy,
} from '@/features/transactions/utils/transactionActionCopy';
import {
  type CopiedSpaceIds,
  getTransactionCopyKey,
  getTransactionCopyTargets,
} from '@/features/transactions/utils/transactionCopyIdentity';
import { resolveTransactionForDetail } from '@/features/transactions/utils/transactionDetailResolution';
import { parseProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';
import { i18n } from '@/lib/i18n/i18n';

type PreviewItemActionsSource = {
  /** Categorías del espacio activo. */
  categories: readonly Category[];
  /** Espacios donde un movimiento ya existe por una copia anterior. */
  copiedSpaceIds: CopiedSpaceIds;
  /** Cuentas del espacio activo. */
  moneyAccounts: readonly MoneyAccount[];
  onArchiveCategory: (categoryId: string) => void;
  onArchiveMoneyAccount: (moneyAccountId: string) => void;
  onCopyCategory: (
    categoryId: string,
    targetSpaceId: string,
  ) => Promise<boolean>;
  onCopyTransaction: (
    transactionIds: string | readonly string[],
    targetSpaceId: string,
  ) => Promise<boolean>;
  onDeleteTransaction: (transactionId: string) => void | Promise<void>;
  onEditCategory: (categoryId: string) => void;
  onEditMoneyAccount: (moneyAccountId: string) => void;
  onEditTransaction: (transaction: SessionTransaction) => void;
  shareTargets: readonly CopyTarget[];
  /** Movimientos del espacio activo. */
  transactions: readonly SessionTransaction[];
};

/**
 * Copiar con el mismo trazo grueso que eliminar y editar en la pulsación larga.
 * Los detalles conservan el `copy-outline` fino de Ionicons.
 */
function CopyActionIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M15.6 5.4A2.6 2.6 0 0 0 13 2.8H5.6A2.6 2.6 0 0 0 3 5.4v7.4a2.6 2.6 0 0 0 2.6 2.6"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.6}
      />
      <Rect
        height={12.8}
        rx={3}
        stroke={color}
        strokeWidth={2.6}
        width={12.8}
        x={8.4}
        y={8.4}
      />
    </Svg>
  );
}

/** Uno tras otro: cada borrado recarga los movimientos del espacio. */
async function runInSequence(
  ids: readonly string[],
  run: (id: string) => void | Promise<void>,
) {
  for (const id of ids) await run(id);
}

/**
 * Acciones de la pulsación larga sobre una tarjeta: eliminar, editar y copiar
 * a otro espacio, con las mismas reglas que el detalle. Una repetición
 * proyectada no se copia, y copiar solo aparece si existe otro espacio donde
 * el movimiento aún no esté. Una cuenta, como en su detalle, solo se elimina
 * o edita.
 *
 * Al copiar, todas las repeticiones de una serie son la misma copia: la
 * selección no deja marcar dos y varias de la misma serie no se copian.
 *
 * Varios movimientos, de la selección múltiple, se eliminan o copian juntos;
 * editar solo se ofrece para uno. Las categorías y cuentas no se seleccionan
 * en grupo.
 */
export function resolvePreviewItemActions(
  target: PreviewActionSubject,
  {
    categories,
    copiedSpaceIds,
    moneyAccounts,
    onArchiveCategory,
    onArchiveMoneyAccount,
    onCopyCategory,
    onCopyTransaction,
    onDeleteTransaction,
    onEditCategory,
    onEditMoneyAccount,
    onEditTransaction,
    shareTargets,
    transactions,
  }: PreviewItemActionsSource,
): readonly PreviewAction[] | null {
  if (target.kind === 'transaction') {
    const items = target.ids.flatMap(
      (id) => resolveTransactionForDetail(transactions, id) ?? [],
    );
    const [transaction] = items;
    if (!transaction || items.length !== target.ids.length) return null;
    const ids = items.map((item) => item.id);
    const isSingle = items.length === 1;
    const transactionCategory = categories.find(
      (item) => item.id === transaction.categoryId,
    );
    const title = isSingle
      ? transaction.title.trim() ||
        transactionCategory?.name ||
        i18n.t('navigation.previewActions.transactionFallbackTitle')
      : i18n.t('navigation.previewActions.transactionsCount', {
          count: items.length,
        });
    const copyKeys = new Set(items.map(getTransactionCopyKey));
    const copyTargets = getTransactionCopyTargets(
      items,
      shareTargets,
      copiedSpaceIds,
    );
    const canCopy =
      copyTargets.length > 0 &&
      copyKeys.size === items.length &&
      items.every((item) => parseProjectedTransactionId(item.id) === null);

    return [
      {
        key: 'delete',
        kind: 'confirm',
        accessibilityLabel: isSingle
          ? i18n.t('navigation.previewActions.deleteTransaction')
          : i18n.t('navigation.previewActions.deleteTransactions'),
        confirmation: isSingle
          ? getTransactionDeletionCopy(transaction)
          : getTransactionsDeletionCopy(items.length),
        icon: DetailDeleteIcon,
        onConfirm: () => void runInSequence(ids, onDeleteTransaction),
      },
      ...(isSingle
        ? [
            {
              key: 'edit',
              kind: 'run',
              accessibilityLabel: i18n.t(
                'navigation.previewActions.editTransaction',
              ),
              icon: DetailEditIcon,
              onPress: () => onEditTransaction(transaction),
            } satisfies PreviewAction,
          ]
        : []),
      ...(canCopy
        ? [
            {
              key: 'copy',
              kind: 'copyToSpace',
              accessibilityLabel: isSingle
                ? i18n.t('navigation.previewActions.copyTransaction')
                : i18n.t('navigation.previewActions.copyTransactions'),
              icon: CopyActionIcon,
              selectionKey: getTransactionCopyKey(transaction),
              request: {
                ...(isSingle
                  ? transactionCopyToSpaceCopy
                  : transactionsCopyToSpaceCopy),
                ...(isSingle
                  ? getCategoryCopyItem(transactionCategory)
                  : {
                      stackedItems: items
                        .slice(0, maxStackedCopyItems)
                        .map((item) =>
                          getCategoryCopyItem(
                            categories.find(({ id }) => id === item.categoryId),
                          ),
                        ),
                    }),
                itemName: title,
                onSelect: (targetSpaceId: string) =>
                  onCopyTransaction(
                    isSingle ? transaction.id : ids,
                    targetSpaceId,
                  ),
                targets: copyTargets,
              },
            } satisfies PreviewAction,
          ]
        : []),
    ];
  }

  const [id] = target.ids;
  if (id === undefined || target.ids.length > 1) return null;

  if (target.kind === 'moneyAccount') {
    const moneyAccount = moneyAccounts.find(
      (current) => current.id === id && !current.isArchived,
    );
    if (!moneyAccount) return null;

    return [
      {
        key: 'delete',
        kind: 'confirm',
        accessibilityLabel: i18n.t('navigation.previewActions.deleteAccount'),
        confirmation: moneyAccountDeletionCopy,
        icon: DetailDeleteIcon,
        onConfirm: () => onArchiveMoneyAccount(moneyAccount.id),
      },
      {
        key: 'edit',
        kind: 'run',
        accessibilityLabel: i18n.t('navigation.previewActions.editAccount'),
        icon: DetailEditIcon,
        onPress: () => onEditMoneyAccount(moneyAccount.id),
      },
    ];
  }

  const category = categories.find(
    (current) => current.id === id && !current.isArchived,
  );
  if (!category) return null;

  return [
    {
      key: 'delete',
      kind: 'confirm',
      accessibilityLabel: i18n.t('navigation.previewActions.deleteCategory'),
      confirmation: categoryDeletionCopy,
      icon: DetailDeleteIcon,
      onConfirm: () => onArchiveCategory(category.id),
    },
    {
      key: 'edit',
      kind: 'run',
      accessibilityLabel: i18n.t('navigation.previewActions.editCategory'),
      icon: DetailEditIcon,
      onPress: () => onEditCategory(category.id),
    },
    ...(shareTargets.length > 0
      ? [
          {
            key: 'copy',
            kind: 'copyToSpace',
            accessibilityLabel: i18n.t(
              'navigation.previewActions.copyCategory',
            ),
            icon: CopyActionIcon,
            request: {
              ...getCategoryCopyRequest(category),
              onSelect: (targetSpaceId: string) =>
                onCopyCategory(category.id, targetSpaceId),
              targets: shareTargets,
            },
          } satisfies PreviewAction,
        ]
      : []),
  ];
}
