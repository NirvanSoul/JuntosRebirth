import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { AvatarPickSource } from '@/features/profile/types';

const avatarMaxDimension = 512;
const avatarCompressionQuality = 0.6;
const avatarDirectoryName = 'avatars';
const avatarFileName = 'profile-avatar.jpg';

async function requestAvatarPermission(
  source: AvatarPickSource,
): Promise<boolean> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

async function launchAvatarPicker(
  source: AvatarPickSource,
): Promise<string | null> {
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
  return result.assets[0]?.uri ?? null;
}

async function compressAvatar(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri).resize({
    width: avatarMaxDimension,
    height: avatarMaxDimension,
  });
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

  const pickedUri = await launchAvatarPicker(source);
  if (!pickedUri) return null;

  const compressedUri = await compressAvatar(pickedUri);
  return storeAvatarPermanently(compressedUri);
}
