import type { Category } from '@/features/categories/types';
import { copyTransactionToSpace } from '@/features/transactions/services/copyTransactionToSpace';
import type { SessionTransaction } from '@/features/transactions/types';
import { useCopyToSpace } from '@/features/spaces/hooks/useCopyToSpace';

jest.mock('@/features/transactions/services/copyTransactionToSpace', () => ({
  copyTransactionToSpace: jest.fn(),
}));
jest.mock('@/features/categories/services/copyCategoryToSpace', () => ({
  copyCategoryToSpace: jest.fn(),
}));

const copyMock = jest.mocked(copyTransactionToSpace);

const category: Category = {
  id: 'category-home',
  spaceId: 'couple',
  name: 'Casa',
  icon: 'house',
  colorToken: 'slate',
  isDefault: false,
  isArchived: false,
};
const rent: SessionTransaction = {
  amountMinor: 80000,
  categoryId: 'category-home',
  createdBy: 'user-1',
  currency: 'EUR',
  id: 'rent-october',
  occurredOn: '2026-10-01',
  recurrence: 'monthly',
  recurrenceSeriesId: 'series-rent',
  spaceId: 'couple',
  title: 'Casa',
  type: 'expense',
  updatedAt: '2026-10-01T12:00:00.000Z',
};
const rentSeptember = {
  ...rent,
  id: 'rent-september',
  occurredOn: '2026-09-01',
};
const coffee = {
  ...rent,
  id: 'coffee',
  recurrence: 'once' as const,
  recurrenceSeriesId: undefined,
};

function useCopyHarness(transactions: readonly SessionTransaction[]) {
  const announce = jest.fn();
  const { copyTransaction } = useCopyToSpace({
    activeSpaceId: 'couple',
    announce,
    categories: [category],
    onCategoryCopied: jest.fn(),
    onChangesPublished: jest.fn(),
    onError: jest.fn(),
    onTransactionsCopied: jest.fn(),
    spaces: [
      { id: 'couple', name: 'Juntos' },
      { id: 'personal', name: 'Personal' },
    ] as never,
    transactions,
  });
  return { announce, copyTransaction };
}

const copiedIds = () =>
  copyMock.mock.calls.map(([input]) => input.transactionId);

describe('useCopyToSpace', () => {
  beforeEach(() => {
    copyMock.mockReset();
    copyMock.mockResolvedValue({
      copiedTransactions: [],
      createdCategory: null,
      itemName: 'Casa',
      status: 'copied',
    });
  });

  it('copia una sola vez cada serie, desde la repetición más antigua elegida', async () => {
    const { announce, copyTransaction } = useCopyHarness([
      rentSeptember,
      rent,
      coffee,
    ]);

    await expect(
      copyTransaction(['rent-october', 'coffee', 'rent-september'], 'personal'),
    ).resolves.toBe(true);
    expect(copiedIds()).toEqual(['rent-september', 'coffee']);
    expect(announce).toHaveBeenCalledWith(
      expect.objectContaining({ message: '2 movimientos copiados' }),
    );
  });

  it('omite lo que ya está en el destino por una copia anterior', async () => {
    const previousCopy = {
      ...rent,
      id: 'rent-copy',
      recurrenceSeriesId: 'series-copy',
      sourceTransactionId: 'rent-october',
      spaceId: 'personal',
    };
    const { copyTransaction } = useCopyHarness([
      rentSeptember,
      rent,
      previousCopy,
    ]);

    await expect(copyTransaction('rent-september', 'personal')).resolves.toBe(
      false,
    );
    expect(copyMock).not.toHaveBeenCalled();
  });
});
