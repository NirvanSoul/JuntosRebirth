import { StyleSheet } from 'react-native';

import { CreatePreviewBadge } from '@/components/ui/CreatePreviewBadge/CreatePreviewBadge';
import { renderWithTheme } from '@/test/renderWithTheme';
import { lightColors } from '@/theme/colors';
import { minTouchTarget } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

describe('CreatePreviewBadge', () => {
  it('usa el mismo tamaño de texto que el título de una preview de categoría', async () => {
    const screen = await renderWithTheme(
      <CreatePreviewBadge
        accessibilityLabel="Crear categoría"
        label="Crear categoría"
        onPress={jest.fn()}
        testID="create-category-badge"
      />,
    );

    expect(
      StyleSheet.flatten(screen.getByText('Crear categoría').props.style)
        .fontSize,
    ).toBe(typography.footnote.fontSize);
  });

  it('deja que el contenido determine su ancho y conserva el padding', async () => {
    const screen = await renderWithTheme(
      <CreatePreviewBadge
        accessibilityLabel="Crear cuenta"
        label="Crear cuenta"
        onPress={jest.fn()}
        testID="create-account-badge"
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('create-account-badge').props.style,
      ),
    ).toMatchObject({
      minHeight: minTouchTarget,
      paddingHorizontal: spacing.md,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('create-account-badge').props.style)
        .width,
    ).toBeUndefined();
  });

  it('ofrece la variante de quitar con fondo oscuro y estado de opción', async () => {
    const screen = await renderWithTheme(
      <CreatePreviewBadge
        accessibilityLabel="Sin cuenta"
        bordered
        label="Sin cuenta"
        onPress={jest.fn()}
        removeSelected
        testID="no-account-badge"
      />,
    );

    const badge = screen.getByTestId('no-account-badge');
    expect(badge.props.accessibilityState).toMatchObject({ checked: true });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('no-account-badge-icon-background').props.style,
      ).backgroundColor,
    ).toBe(lightColors.textPrimary);
    expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
      borderColor: lightColors.textPrimary,
      minHeight: minTouchTarget,
    });
  });
});
