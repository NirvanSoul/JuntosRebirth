import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { clearPendingEmailVerification } from '@/features/auth/services/pendingEmailVerification';
import type { VerifyCodeInput, VerifyCodePurpose } from '@/features/auth/types';

/**
 * Compartido entre el registro y la recuperación de contraseña: ambos
 * flujos verifican un código enviado por correo del mismo modo, solo cambia
 * el `purpose` que se envía a Better Auth.
 */
export async function verifyCode(input: VerifyCodeInput): Promise<void> {
  const gateway = createJuntossAuthGateway();
  await gateway.verifyOtp(input);
  if (input.purpose === 'signup') {
    await clearPendingEmailVerification();
  }
}

export async function resendCode(
  email: string,
  purpose: VerifyCodePurpose,
): Promise<void> {
  const gateway = createJuntossAuthGateway();
  if (purpose === 'signup') {
    await gateway.resendSignUpCode(email);
  } else {
    await gateway.resendRecoveryCode(email);
  }
}
