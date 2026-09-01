import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import type { LoginInput } from '@/features/auth/types';

export async function login(input: LoginInput): Promise<void> {
  const gateway = createJuntossAuthGateway();
  await gateway.signInWithPassword(input);
}
