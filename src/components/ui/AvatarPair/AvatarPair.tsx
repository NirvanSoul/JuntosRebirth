import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar/Avatar';
import { radii } from '@/theme/radii';
import { useTheme } from '@/theme/useTheme';

type AvatarPairProps = {
  /** Lado de cada avatar. Ambos comparten tamaño. */
  size: number;
  /** Foto que queda delante. En un espacio juntos es la de quien usa el móvil. */
  frontUri?: string | null;
  /** Foto que queda detrás, asomando por la derecha. */
  backUri?: string | null;
  /**
   * Color del aro que separa la foto de delante de la de detrás. Por defecto
   * `colors.surface`, que es el fondo de las superficies sobre las que se
   * apoya el par; se pasa explícito solo si el par vive sobre otro fondo.
   */
  ringColor?: string;
  testID?: string;
};

/** Proporción de una foto que tapa la que va delante. */
const overlapRatio = 0.1;

/** Grosor del aro exterior de la foto de delante. */
const ringWidth = 2;

/**
 * Dos fotos de perfil solapadas horizontalmente.
 *
 * El contenedor usa `row-reverse` y el JSX pinta primero el de atrás: así el de
 * delante se dibuja el último —queda encima también en Android, donde el orden
 * de dibujado manda sobre `zIndex`— pero se coloca a la izquierda.
 *
 * El aro no es un `borderWidth`: en React Native los bordes se dibujan hacia
 * dentro y encogerían la foto. Se resuelve con un contenedor relleno del color
 * de fondo y `padding`, de modo que el aro crece hacia fuera y la foto conserva
 * su tamaño. Como el color sale del tema, sigue al modo claro u oscuro sin que
 * el componente tenga que saber en cuál está.
 */
export function AvatarPair({
  size,
  frontUri,
  backUri,
  ringColor,
  testID,
}: AvatarPairProps) {
  const { colors } = useTheme();
  const styles = createStyles(size);

  return (
    <View style={styles.container} testID={testID}>
      <Avatar size={size} testID="avatar-pair-back" uri={backUri} />
      <View
        style={[styles.front, { backgroundColor: ringColor ?? colors.surface }]}
        testID="avatar-pair-front-ring"
      >
        <Avatar size={size} testID="avatar-pair-front" uri={frontUri} />
      </View>
    </View>
  );
}

function createStyles(size: number) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
    },
    front: {
      padding: ringWidth,
      borderRadius: radii.round,
      // El solape se mide entre las fotos, no entre las cajas: al margen del
      // 10% se suma el grosor del aro, que sobresale de la foto de delante.
      // Sin ese sumando, engordar el aro comería solape.
      marginRight: -(size * overlapRatio + ringWidth),
    },
  });
}
