import { createLocalCategory } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import { createLocalTransaction } from '@/features/transactions/repositories/localTransactionRepository';
import { copyTransactionToSpace } from '@/features/transactions/services/copyTransactionToSpace';
import type { SessionTransaction } from '@/features/transactions/types';

jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  createLocalCategory: jest.fn(),
}));
jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    createLocalTransaction: jest.fn(),
  }),
);

const sourceCategory: Category = {
  id: 'cat-personal',
  spaceId: 'personal',
  name: 'Taxi',
  icon: 'taxi',
  colorToken: 'blue',
  isDefault: true,
  isArchived: false,
};

const transaction: SessionTransaction = {
  id: 'tx-1',
  spaceId: 'personal',
  categoryId: 'cat-personal',
  createdBy: 'user-1',
  type: 'expense',
  amountMinor: 1200,
  currency: 'EUR',
  title: 'Taxi al aeropuerto',
  occurredOn: '2026-10-20',
  recurrence: 'once',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

describe('copyTransactionToSpace', () => {
  beforeEach(() => {
    jest.mocked(createLocalCategory).mockImplementation(async (input) => ({
      ...input,
      id: 'cat-juntos',
      isArchived: false,
    }));
    jest.mocked(createLocalTransaction).mockImplementation(async (input) => [
      {
        ...input,
        id: 'tx-copy',
        createdBy: 'user-1',
        updatedAt: '2026-10-21T10:00:00.000Z',
      },
    ]);
  });

  it('crea la categoría que falta en el destino como una fila nueva, sin el id del original', async () => {
    const result = await copyTransactionToSpace({
      categories: [sourceCategory],
      sourceSpaceId: 'personal',
      targetSpaceId: 'juntos',
      transactionId: 'tx-1',
      transactions: [transaction],
    });

    expect(result.status).toBe('copied');
    const categoryInput = jest.mocked(createLocalCategory).mock.calls[0]![0];
    expect(categoryInput.id).toBeUndefined();
    expect(categoryInput).toMatchObject({
      spaceId: 'juntos',
      sourceCategoryId: 'cat-personal',
    });
    expect(jest.mocked(createLocalTransaction).mock.calls[0]![0]).toMatchObject(
      { categoryId: 'cat-juntos', spaceId: 'juntos' },
    );
  });
});
