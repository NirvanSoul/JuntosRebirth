import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImageRef } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  AvatarError,
  avatarQualitiesBelow,
  avatarQualitySteps,
  avatarTargetMaxBytes,
  resolveAvatarCrop,
  resolveAvatarOutputDimension,
  validateAvatarSource,
} from '@/features/profile/services/avatarImage';
import type { AvatarPickSource } from '@/features/profile/types';

const avatarDirectoryName = 'avatars';
const avatarFileName = 'profile-avatar.jpg';

export type PickedAvatar = { uri: string; width: number; height: number };

/**
 * JPEG listo para subir: ya recortado, escalado y comprimido por debajo del
 * tope. `quality` se conserva para que un reintento pueda seguir bajando desde
 * donde se quedó en vez de repetir la escalera entera.
 */
export type PreparedAvatar = {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  quality: number;
  /**
   * Cuánto tardó el pipeline. Se devuelve en vez de registrarse: son medidas
   * útiles para diagnosticar, y quien las quiera ver decide dónde ponerlas sin
   * que este módulo escriba nada por su cuenta.
   */
  durationMs: number;
};

async function requestAvatarPermission(
  source: AvatarPickSource,
): Promise<boolean> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

/**
 * Abre el selector. `null` cuando la persona cancela, que no es un error.
 *
 * `quality: 1` deja la foto intacta: comprimir aquí y otra vez después
 * acumularía artefactos sin ahorrar nada, porque el pase real lo hace
 * `prepareAvatarImage`. El formato de origen —JPEG, PNG, HEIC— da igual: el
 * manipulador exporta JPEG en todos los casos.
 */
export async function pickAvatarImage(
  source: AvatarPickSource,
): Promise<PickedAvatar | null> {
  const granted = await requestAvatarPermission(source);
  if (!granted) {
    throw new AvatarError(
      'AVATAR_PERMISSION_DENIED',
      'Permiso de cámara o galería denegado',
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/** Tamaño real en bytes del fichero generado, no una estimación. */
export function getOutputFileSize(uri: string): number {
  return new File(uri).size;
}

/**
 * Guarda el render en JPEG probando calidades decrecientes hasta caber.
 *
 * El tamaño se mide sobre el fichero escrito, nunca a partir de las
 * dimensiones: un 512×512 puede pesar 30 KiB o 300 KiB según la foto, así que
 * dar por buena una calidad sin pesarla es exactamente el fallo que devuelve
 * `AVATAR_TOO_LARGE` cuando ya se ha gastado la subida.
 *
 * La lista de calidades es finita y decreciente: el bucle termina siempre.
 */
async function saveWithinBudget(
  image: ImageRef,
  qualities: readonly number[],
): Promise<PreparedAvatar> {
  let last: PreparedAvatar | null = null;

  for (const quality of qualities) {
    const saved = await image.saveAsync({
      compress: quality,
      format: SaveFormat.JPEG,
    });
    last = {
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      bytes: getOutputFileSize(saved.uri),
      quality,
      durationMs: 0,
    };
    if (last.bytes <= avatarTargetMaxBytes) return last;
  }

  throw new AvatarError(
    'AVATAR_TOO_LARGE',
    `La foto sigue pesando ${last?.bytes ?? 0} bytes con la calidad mínima`,
  );
}

/**
 * Recorte central cuadrado, escalado a 512 y compresión JPEG.
 *
 * El orden importa: primero `crop` y después `resize`. Escalar antes de
 * recortar deformaría una foto apaisada, que es el defecto que este pipeline
 * existe para evitar.
 *
 * Se usa la API de contexto de expo-image-manipulator 14 —`manipulate()` +
 * `renderAsync()`— y no `manipulateAsync`, que en esta versión está obsoleta.
 * Rendir una sola vez y guardar varias permite recomprimir sin volver a
 * decodificar la imagen en cada intento.
 */
export async function prepareAvatarImage(
  picked: PickedAvatar,
): Promise<PreparedAvatar> {
  validateAvatarSource(picked.width, picked.height);

  const startedAt = Date.now();
  const crop = resolveAvatarCrop(picked.width, picked.height);
  const side = resolveAvatarOutputDimension(crop.width);

  const image = await ImageManipulator.manipulate(picked.uri)
    .crop(crop)
    .resize({ width: side, height: side })
    .renderAsync();

  const prepared = await saveWithinBudget(image, avatarQualitySteps);

  // Solo medidas: ni bytes de imagen, ni rutas de la galería, ni nada que
  // identifique a nadie.
  return { ...prepared, durationMs: Date.now() - startedAt };
}

/**
 * Segundo intento cuando el servidor responde `AVATAR_TOO_LARGE` pese a que el
 * fichero cabía en el presupuesto local.
 *
 * Reanuda la escalera por debajo de la calidad ya usada, así que como mucho
 * quedan cuatro pases y nunca se repite uno. Si no queda ninguna calidad por
 * probar, se propaga el error: a esa foto ya no se le puede pedir más.
 */
export async function recompressAvatarImage(
  picked: PickedAvatar,
  previousQuality: number,
): Promise<PreparedAvatar> {
  const qualities = avatarQualitiesBelow(previousQuality);
  if (qualities.length === 0) {
    throw new AvatarError(
      'AVATAR_TOO_LARGE',
      'No queda margen de compresión para esta foto',
    );
  }

  const crop = resolveAvatarCrop(picked.width, picked.height);
  const side = resolveAvatarOutputDimension(crop.width);
  const image = await ImageManipulator.manipulate(picked.uri)
    .crop(crop)
    .resize({ width: side, height: side })
    .renderAsync();

  return saveWithinBudget(image, qualities);
}

/**
 * Copia el JPEG preparado a `document/avatars/`, fuera de la caché.
 *
 * El render vive en el directorio de caché, que el sistema puede vaciar cuando
 * quiera; el avatar tiene que sobrevivir a un reinicio porque es la fuente que
 * pinta la interfaz.
 */
export function storeAvatarPermanently(preparedUri: string): string {
  const avatarsDirectory = new Directory(Paths.document, avatarDirectoryName);
  if (!avatarsDirectory.exists) {
    avatarsDirectory.create({ intermediates: true });
  }

  const destination = new File(avatarsDirectory, avatarFileName);
  if (destination.exists) destination.delete();

  new File(preparedUri).copy(destination);
  return destination.uri;
}

/** Escribe bytes descargados del servidor como avatar propio. */
export function storeOwnAvatarBytes(bytes: Uint8Array): string {
  const avatarsDirectory = new Directory(Paths.document, avatarDirectoryName);
  if (!avatarsDirectory.exists) {
    avatarsDirectory.create({ intermediates: true });
  }

  const destination = new File(avatarsDirectory, avatarFileName);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(bytes);
  return destination.uri;
}

/** Bytes del JPEG listo para subir. Nunca base64. */
export async function readAvatarBytes(uri: string): Promise<Uint8Array> {
  return new File(uri).bytes();
}
