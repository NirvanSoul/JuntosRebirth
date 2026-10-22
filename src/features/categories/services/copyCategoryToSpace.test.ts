import { createLocalCategory } from '@/features/categories/repositories/localCategoryRepository';
import { copyCategoryToSpace } from '@/features/categories/services/copyCategoryToSpace';
import type { Category } from '@/features/categories/types';

jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  createLocalCategory: jest.fn(),
}));

const source: Category = {
  id: 'cat-personal',
  spaceId: 'personal',
  name: 'Taxi',
  icon: 'taxi',
  colorToken: 'blue',
  isDefault: true,
  isArchived: false,
};

describe('copyCategoryToSpace', () => {
  it('crea la copia como una fila nueva, sin el id del original', async () => {
    jest.mocked(createLocalCategory).mockImplementation(async (input) => ({
      ...input,
      id: 'cat-juntos',
      isArchived: false,
    }));

    const result = await copyCategoryToSpace({
      categories: [source],
      categoryId: 'cat-personal',
      sourceSpaceId: 'personal',
      targetSpaceId: 'juntos',
    });

    expect(result.status).toBe('copied');
    const input = jest.mocked(createLocalCategory).mock.calls[0]![0];
    expect(input.id).toBeUndefined();
    expect(input).toMatchObject({
      spaceId: 'juntos',
      sourceCategoryId: 'cat-personal',
    });
  });
});
