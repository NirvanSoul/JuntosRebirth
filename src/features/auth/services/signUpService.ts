import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import type { SignUpInput } from '@/features/auth/types';

export async function signUp(input: SignUpInput): Promise<void> {
  const gateway = createSupabaseAuthGateway();
  await gateway.signUp(input);
}
