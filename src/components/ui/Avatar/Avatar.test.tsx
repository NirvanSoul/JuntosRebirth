import { StyleSheet } from 'react-native';

import { Avatar } from '@/components/ui/Avatar/Avatar';
import { renderWithTheme } from '@/test/renderWithTheme';
import { radii } from '@/theme/radii';

describe('Avatar', () => {
  it('muestra la imagen cuando recibe una uri', async () => {
    const screen = await renderWithTheme(
      <Avatar size={56} testID="avatar" uri="file:///avatar.jpg" />,
    );

    const image = screen.getByTestId('avatar');
    expect(image.props.source).toEqual({ uri: 'file:///avatar.jpg' });
    expect(StyleSheet.flatten(image.props.style)).toMatchObject({
      width: 56,
      height: 56,
      borderRadius: radii.round,
    });
  });

  it('muestra un icono de respaldo cuando no hay foto', async () => {
    const screen = await renderWithTheme(<Avatar size={56} testID="avatar" />);

    expect(screen.getByTestId('avatar')).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
  });
});
