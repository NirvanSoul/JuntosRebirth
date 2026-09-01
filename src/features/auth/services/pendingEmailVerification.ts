import * as SecureStore from 'expo-secure-store';

const pendingEmailVerificationKey = 'juntoss.pending-email-verification';

/**
 * Conserva solo el correo de un alta pendiente. El proveedor puede renovar la
 * sesión provisional mientras cambia la navegación; este marcador permite
 * retomar el OTP sin guardar nunca la contraseña ni autorizar acceso.
 */
export async function savePendingEmailVerification(
  email: string,
): Promise<void> {
  await SecureStore.setItemAsync(pendingEmailVerificationKey, email);
}

export async function loadPendingEmailVerification(): Promise<string | null> {
  return await SecureStore.getItemAsync(pendingEmailVerificationKey);
}

export async function clearPendingEmailVerification(): Promise<void> {
  await SecureStore.deleteItemAsync(pendingEmailVerificationKey);
}
