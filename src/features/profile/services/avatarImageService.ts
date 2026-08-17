import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { AvatarPickSource } from '@/features/profile/types';

/**
 * La foto solo se usa como miniatura: el sitio donde se muestra más grande son
 * los 56 px de Ajustes, que en una pantalla @3x son 168 px reales. 320 deja
 * margen de sobra para eso y para un avatar algo mayor en el futuro, sin
 * arrastrar el peso de la foto original.
 */
const avatarMaxDimension = 320;
const avatarCompressionQuality = 0.7;
const avatarDirectoryName = 'avatars';
const avatarFileName = 'profile-avatar.jpg';

/**
 * Tope de seguridad en el cliente, igual al del bucket (migración 25). Falla
 * aquí, con un mensaje que la interfaz sabe traducir, en vez de dejar que
 * Storage devuelva un 413 opaco a mitad de la subida.
 */
export const avatarMaxBytes = 262144;

async function requestAvatarPermission(
  source: AvatarPickSource,
): Promise<boolean> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

type PickedAvatar = { uri: string; width: number; height: number };

async function launchAvatarPicker(
  source: AvatarPickSource,
): Promise<PickedAvatar | null> {
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

/**
 * Recomprime la foto ya recortada en 1:1.
 *
 * El `resize` se salta cuando la imagen recortada ya es más pequeña que el
 * lado objetivo. Fijar ancho y alto a 320 sin comprobarlo **agranda** una foto
 * menor, que es peso extra sin ninguna ganancia de nitidez.
 */
async function compressAvatar(picked: PickedAvatar): Promise<string> {
  const needsResize =
    picked.width > avatarMaxDimension || picked.height > avatarMaxDimension;
  const context = ImageManipulator.manipulate(picked.uri);
  if (needsResize) {
    // Solo se fija el ancho: el alto lo deriva la librería manteniendo la
    // proporción, de modo que un recorte que no sea exactamente cuadrado no
    // se deforma.
    context.resize({ width: avatarMaxDimension });
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    compress: avatarCompressionQuality,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

function storeAvatarPermanently(compressedUri: string): string {
  const avatarsDirectory = new Directory(Paths.document, avatarDirectoryName);
  if (!avatarsDirectory.exists) {
    avatarsDirectory.create({ intermediates: true });
  }

  const destination = new File(avatarsDirectory, avatarFileName);
  if (destination.exists) destination.delete();

  new File(compressedUri).copy(destination);
  return destination.uri;
}

/**
 * `null` cuando la persona cancela la selección, no un error.
 */
export async function pickAndStoreAvatar(
  source: AvatarPickSource,
): Promise<string | null> {
  const granted = await requestAvatarPermission(source);
  if (!granted) {
    throw new Error('Permiso de cámara o galería denegado');
  }

  const picked = await launchAvatarPicker(source);
  if (!picked) return null;

  const compressedUri = await compressAvatar(picked);
  const storedUri = storeAvatarPermanently(compressedUri);

  const storedSize = new File(storedUri).info().size ?? 0;
  if (storedSize > avatarMaxBytes) {
    new File(storedUri).delete();
    throw new Error('La foto comprimida sigue siendo demasiado grande');
  }

  return storedUri;
}
