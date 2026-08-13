import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import type { VerifyCodeInput, VerifyCodePurpose } from '@/features/auth/types';

/**
 * Compartido entre el registro y la recuperación de contraseña: ambos
 * flujos verifican un código enviado por correo del mismo modo, solo cambia
 * el `purpose` que se envía a Supabase.
 */
export async function verifyCode(input: VerifyCodeInput): Promise<void> {
  const gateway = createSupabaseAuthGateway();
  await gateway.verifyOtp(input);
}

export async function resendCode(
  email: string,
  purpose: VerifyCodePurpose,
): Promise<void> {
  const gateway = createSupabaseAuthGateway();
  if (purpose === 'signup') {
    await gateway.resendSignUpCode(email);
  } else {
    await gateway.resendRecoveryCode(email);
  }
}
