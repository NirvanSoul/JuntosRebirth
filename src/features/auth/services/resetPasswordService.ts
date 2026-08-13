import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';

export async function requestPasswordReset(email: string): Promise<void> {
  const gateway = createSupabaseAuthGateway();
  await gateway.requestPasswordReset(email);
}

/**
 * Solo puede llamarse después de verificar el código de recuperación:
 * `verifyOtp({ type: 'recovery' })` deja establecida una sesión que
 * `updateUser` reutiliza para fijar la nueva contraseña.
 */
export async function setNewPassword(password: string): Promise<void> {
  const gateway = createSupabaseAuthGateway();
  await gateway.setNewPassword(password);
}
