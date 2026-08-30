import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import type { SignUpInput } from '@/features/auth/types';

export async function signUp(input: SignUpInput): Promise<void> {
  const gateway = createJuntossAuthGateway();
  await gateway.signUp(input);
}
