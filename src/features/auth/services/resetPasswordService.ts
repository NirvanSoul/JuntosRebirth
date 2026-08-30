import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';

export async function requestPasswordReset(email: string): Promise<void> {
  const gateway = createJuntossAuthGateway();
  await gateway.requestPasswordReset(email);
}

/**
 * Solo puede llamarse después de verificar el código de recuperación.
 * Verificar no abre sesión a propósito: la API exige correo, código y
 * contraseña juntos, para que tener el código no equivalga a entrar.
 */
export async function setNewPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<void> {
  const gateway = createJuntossAuthGateway();
  await gateway.setNewPassword(input);
}
