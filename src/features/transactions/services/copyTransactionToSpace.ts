import { createLocalCategory } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import { findEquivalentCategoryBySpace } from '@/features/categories/utils/categoryCatalog';
import { createLocalTransaction } from '@/features/transactions/repositories/localTransactionRepository';
import type { SessionTransaction } from '@/features/transactions/types';

type CopyTransactionToSpaceInput = {
  categories: readonly Category[];
  sourceSpaceId: string;
  targetSpaceId: string;
  transactionId: string;
  transactions: readonly SessionTransaction[];
};

export type CopyTransactionToSpaceResult =
  | {
      copiedTransactions: readonly SessionTransaction[];
      /** Solo cuando hubo que crearla en el espacio de destino. */
      createdCategory: Category | null;
      itemName: string;
      status: 'copied';
    }
  | { status: 'rejected' };

/**
 * Copia un movimiento a otro espacio con una categoría válida allí: reutiliza
 * la equivalente si existe y, si no, crea una copia de la categoría sin
 * presupuesto. La copia es independiente y no modifica el original.
 *
 * La cuenta no viaja: pertenece al espacio de origen, así que la copia nace
 * sin cuenta en vez de arrastrar una que en el destino no existe.
 */
export async function copyTransactionToSpace({
  categories,
  sourceSpaceId,
  targetSpaceId,
  transactionId,
  transactions,
}: CopyTransactionToSpaceInput): Promise<CopyTransactionToSpaceResult> {
  const source = transactions.find(
    (transaction) => transaction.id === transactionId,
  );
  const sourceCategory = source
    ? categories.find((category) => category.id === source.categoryId)
    : undefined;

  if (
    !source ||
    source.spaceId !== sourceSpaceId ||
    !sourceCategory ||
    sourceCategory.spaceId !== sourceSpaceId ||
    targetSpaceId === sourceSpaceId
  ) {
    return { status: 'rejected' };
  }

  const existingTargetCategory = findEquivalentCategoryBySpace(
    categories,
    targetSpaceId,
    sourceCategory.name,
  );
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
  const copiedTransactions = await createLocalTransaction({
    ...source,
    id: undefined,
    spaceId: targetSpaceId,
    categoryId: targetCategory.id,
    moneyAccountId: undefined,
    sourceTransactionId: source.id,
    customOccurrenceDates:
      source.recurrence === 'custom' ? [source.occurredOn] : undefined,
  });

  return {
    copiedTransactions,
    createdCategory: existingTargetCategory ? null : targetCategory,
    itemName: source.title.trim() || sourceCategory.name,
    status: 'copied',
  };
}
