import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';
import { dynamicTypeRamp, maxFontScale, typography } from '@/theme/typography';

describe('Text', () => {
  it('aplica la variante y su tope de escalado', async () => {
    const screen = await renderWithTheme(
      <Text variant="subheading">Categorías</Text>,
    );
    const node = screen.getByText('Categorías');
    const style = StyleSheet.flatten(node.props.style);

    expect(style.fontSize).toBe(typography.subheading.fontSize);
    expect(style.lineHeight).toBe(typography.subheading.lineHeight);
    expect(node.props.maxFontSizeMultiplier).toBe(maxFontScale.subheading);
    expect(node.props.dynamicTypeRamp).toBe(dynamicTypeRamp.subheading);
  });

  it('usa la variante body cuando no se indica ninguna', async () => {
    const screen = await renderWithTheme(<Text>Balance disponible</Text>);
    const style = StyleSheet.flatten(
      screen.getByText('Balance disponible').props.style,
    );

    expect(style.fontSize).toBe(typography.body.fontSize);
    expect(style.color).toBe(colors.textPrimary);
  });

  it('permite sobrescribir tono y peso sin salir de los tokens', async () => {
    const screen = await renderWithTheme(
      <Text tone="income" variant="footnote" weight="bold">
        +12,00 €
      </Text>,
    );
    const style = StyleSheet.flatten(screen.getByText('+12,00 €').props.style);

    expect(style.color).toBe(colors.income);
    expect(style.fontFamily).toBe(fontFamily.bold);
    expect(style.fontSize).toBe(typography.footnote.fontSize);
  });
});
