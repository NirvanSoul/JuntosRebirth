import { StyleSheet, View } from 'react-native';

import { AppearancePicker } from '@/components/ui/AppearancePicker/AppearancePicker';
import { renderWithTheme } from '@/test/renderWithTheme';
import { darkColors, lightColors } from '@/theme/colors';

const colorOptions = [{ color: '#842FFB', value: 'violet' }] as const;
const iconSections = [
  { icons: ['money', 'bank'] as const, title: 'Finanzas' },
] as const;

describe('AppearancePicker', () => {
  it.each([
    ['light', lightColors.textSecondary],
    ['dark', darkColors.textSecondary],
  ] as const)(
    'usa un gris legible para los iconos en modo %s',
    async (appearance, expectedColor) => {
      const screen = await renderWithTheme(
        <AppearancePicker
          colorOptions={colorOptions}
          iconSections={iconSections}
          onSelectColor={jest.fn()}
          onSelectIcon={jest.fn()}
          renderIcon={(icon, color) => (
            <View
              style={{ backgroundColor: color }}
              testID={`appearance-icon-${icon}`}
            />
          )}
          selectedColor="violet"
          selectedIcon="bank"
        />,
        { appearance },
      );

      expect(
        StyleSheet.flatten(
          screen.getByTestId('appearance-icon-money').props.style,
        ).backgroundColor,
      ).toBe(expectedColor);
      expect(
        StyleSheet.flatten(
          screen.getByTestId('appearance-icon-bank').props.style,
        ).backgroundColor,
      ).toBe(lightColors.onBrand);
      expect(
        StyleSheet.flatten(screen.getByLabelText('Icono bank').props.style),
      ).toMatchObject({ backgroundColor: '#842FFB', borderWidth: 0 });
      expect(
        StyleSheet.flatten(screen.getByLabelText('Color violet').props.style),
      ).toMatchObject({ borderColor: lightColors.onBrand, borderWidth: 3 });
    },
  );
});
