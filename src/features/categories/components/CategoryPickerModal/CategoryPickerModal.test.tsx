import { Dimensions, StyleSheet } from 'react-native';

import { CategoryPickerModal } from '@/features/categories/components/CategoryPickerModal/CategoryPickerModal';
import { renderWithTheme } from '@/test/renderWithTheme';
import { layout, resolveLayoutDensity } from '@/theme/layout';

describe('CategoryPickerModal', () => {
  it('mantiene cada página del carrusel dentro del ancho útil del modal', async () => {
    const screen = await renderWithTheme(
      <CategoryPickerModal
        categories={[]}
        mode="create"
        onClose={jest.fn()}
        onCreateCategory={jest.fn()}
        onCreateTemplates={jest.fn()}
        onSelect={jest.fn()}
        selectedCategoryId={null}
        visible
      />,
    );

    const pages = screen.getByTestId('category-template-pages');
    const pagesStyle = StyleSheet.flatten(pages.props.style);
    const window = Dimensions.get('window');
    const density = resolveLayoutDensity(window.height);

    expect(pagesStyle.width).toBe(
      window.width - layout.screenGutter[density] * 2,
    );
    expect(pagesStyle.marginLeft).toBeUndefined();
    expect(pages.props.getItemLayout([], 0).length).toBe(pagesStyle.width);
  });
});
