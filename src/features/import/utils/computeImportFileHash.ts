import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

/**
 * Hash estable del archivo elegido, usado solo para detectar reimportaciones
 * (Bible §49, §67). Nunca se sube el archivo en sí, solo este hash.
 */
export async function computeImportFileHash(uri: string): Promise<string> {
  const base64 = await new File(uri).base64();
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
}
