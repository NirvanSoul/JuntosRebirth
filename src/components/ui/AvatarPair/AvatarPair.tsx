import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar/Avatar';

type AvatarPairProps = {
  /** Lado de cada avatar. Ambos comparten tamaño. */
  size: number;
  /** Foto que queda delante. En un espacio juntos es la de quien usa el móvil. */
  frontUri?: string | null;
  /** Foto que queda detrás, asomando por la derecha. */
  backUri?: string | null;
  testID?: string;
};

/**
 * Proporción del avatar que tapa el que va delante. El solape se aplica como
 * margen negativo, así el ancho del par es `size * (2 - overlapRatio)` y el
 * contenedor no necesita medidas fijas.
 */
const overlapRatio = 0.1;

/**
 * Dos fotos de perfil solapadas horizontalmente.
 *
 * El contenedor usa `row-reverse` y el JSX pinta primero el de atrás: así el de
 * delante se dibuja el último —queda encima también en Android, donde el orden
 * de dibujado manda sobre `zIndex`— pero se coloca a la izquierda.
 */
export function AvatarPair({
  size,
  frontUri,
  backUri,
  testID,
}: AvatarPairProps) {
  const styles = createStyles(size);

  return (
    <View style={styles.container} testID={testID}>
      <Avatar size={size} testID="avatar-pair-back" uri={backUri} />
      <View style={styles.front}>
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
      marginRight: -size * overlapRatio,
    },
  });
}
