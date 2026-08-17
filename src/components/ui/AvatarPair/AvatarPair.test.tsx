import { StyleSheet } from 'react-native';

import { AvatarPair } from '@/components/ui/AvatarPair/AvatarPair';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('AvatarPair', () => {
  it('pinta la foto de delante y la de detrás', async () => {
    const screen = await renderWithTheme(
      <AvatarPair
        backUri="file:///pareja.jpg"
        frontUri="file:///yo.jpg"
        size={36}
      />,
    );

    expect(screen.getByTestId('avatar-pair-front').props.source).toEqual({
      uri: 'file:///yo.jpg',
    });
    expect(screen.getByTestId('avatar-pair-back').props.source).toEqual({
      uri: 'file:///pareja.jpg',
    });
  });

  it('solapa el avatar de delante un 10% de su tamaño', async () => {
    const screen = await renderWithTheme(
      <AvatarPair
        backUri="file:///pareja.jpg"
        frontUri="file:///yo.jpg"
        size={40}
        testID="avatar-pair"
      />,
    );

    const front = screen.getByTestId('avatar-pair-front').parent;
    expect(StyleSheet.flatten(front?.props.style)).toMatchObject({
      marginRight: -4,
    });
  });

  it('dibuja el avatar de delante el último para que quede encima', async () => {
    const screen = await renderWithTheme(
      <AvatarPair
        backUri="file:///pareja.jpg"
        frontUri="file:///yo.jpg"
        size={36}
        testID="avatar-pair"
      />,
    );

    const container = screen.getByTestId('avatar-pair');
    expect(StyleSheet.flatten(container.props.style)).toMatchObject({
      flexDirection: 'row-reverse',
    });
  });

  it('cae al icono de respaldo cuando falta una de las dos fotos', async () => {
    const screen = await renderWithTheme(
      <AvatarPair frontUri="file:///yo.jpg" size={36} />,
    );

    expect(screen.getByTestId('avatar-pair-front').props.source).toEqual({
      uri: 'file:///yo.jpg',
    });
    expect(screen.getByTestId('avatar-pair-back').props.source).toBeUndefined();
  });
});
