import { within } from '@testing-library/react-native';

import { ActivityCategoryDetail } from '@/features/activity/components/ActivityCategoryDetail';
import type { CategorySummary } from '@/features/categories/utils/categorySummary';
import { renderWithTheme } from '@/test/renderWithTheme';

function createCategories(count: number): CategorySummary[] {
  return Array.from({ length: count }, (_, index) => ({
    colorToken: 'blue',
    expenseMinor: 1000,
    icon: 'car',
    id: `category-${index}`,
    incomeMinor: 0,
    name: `Categoría ${index + 1}`,
    transactionCount: 1,
  }));
}

function renderList(count: number) {
  return renderWithTheme(
    <ActivityCategoryDetail
      budgetExpenseByCategoryId={new Map()}
      categories={createCategories(count)}
      categoryView="list"
      currency="EUR"
      hasBreakdownData
      spaceCurrency="EUR"
    />,
  );
}

describe('ActivityCategoryDetail', () => {
  it('mantiene una sola lista cuando hay cuatro categorías o menos', async () => {
    const screen = await renderList(4);

    expect(screen.queryByTestId('activity-category-preview-page')).toBeNull();
    expect(
      screen.getAllByTestId('activity-category-separator', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(3);
  });

  it('agrupa la lista de cuatro en cuatro en páginas deslizables', async () => {
    const screen = await renderList(6);
    const pages = screen.getAllByTestId('activity-category-preview-page');

    expect(
      screen.getByTestId('activity-category-preview-list').props,
    ).toMatchObject({
      horizontal: true,
    });
    expect(pages).toHaveLength(2);
    expect(within(pages[0]!).getByText('Categoría 4')).toBeTruthy();
    expect(within(pages[1]!).getByText('Categoría 5')).toBeTruthy();
    expect(within(pages[1]!).getByText('Categoría 6')).toBeTruthy();
  });
});
