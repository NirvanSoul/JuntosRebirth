import { StyleSheet } from 'react-native';

import { AvatarPair } from '@/components/ui/AvatarPair/AvatarPair';
import { renderWithTheme } from '@/test/renderWithTheme';
import { darkColors, lightColors } from '@/theme/colors';

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

  it('solapa las fotos un 10% contando el grosor del aro', async () => {
    const screen = await renderWithTheme(
      <AvatarPair
        backUri="file:///pareja.jpg"
        frontUri="file:///yo.jpg"
        size={40}
        testID="avatar-pair"
      />,
    );

    // 10% de 40 son 4 px de solape entre fotos, más los 2 px que el aro
    // sobresale de la de delante: sin ese sumando, el aro comería solape.
    const ring = screen.getByTestId('avatar-pair-front-ring');
    expect(StyleSheet.flatten(ring.props.style)).toMatchObject({
      marginRight: -6,
      padding: 2,
    });
  });

  it('pinta el aro con el color de superficie del modo claro', async () => {
    const screen = await renderWithTheme(
      <AvatarPair frontUri="file:///yo.jpg" size={36} />,
      { appearance: 'light' },
    );

    const ring = screen.getByTestId('avatar-pair-front-ring');
    expect(StyleSheet.flatten(ring.props.style).backgroundColor).toBe(
      lightColors.surface,
    );
  });

  it('cambia el color del aro en modo oscuro', async () => {
    const screen = await renderWithTheme(
      <AvatarPair frontUri="file:///yo.jpg" size={36} />,
      { appearance: 'dark' },
    );

    const ring = screen.getByTestId('avatar-pair-front-ring');
    expect(StyleSheet.flatten(ring.props.style).backgroundColor).toBe(
      darkColors.surface,
    );
    // El aro solo cumple su función si contrasta con el fondo contrario.
    expect(darkColors.surface).not.toBe(lightColors.surface);
  });

  it('permite forzar el color del aro cuando el par vive sobre otro fondo', async () => {
    const screen = await renderWithTheme(
      <AvatarPair frontUri="file:///yo.jpg" ringColor="#ff0000" size={36} />,
    );

    const ring = screen.getByTestId('avatar-pair-front-ring');
    expect(StyleSheet.flatten(ring.props.style).backgroundColor).toBe(
      '#ff0000',
    );
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
