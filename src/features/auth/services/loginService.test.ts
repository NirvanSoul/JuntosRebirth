import type { AuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { login } from '@/features/auth/services/loginService';

jest.mock('@/features/auth/gateways/juntossAuthGateway');

function createGatewayStub(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signUp: jest.fn(),
    verifyOtp: jest.fn(),
    resendSignUpCode: jest.fn(),
    resendRecoveryCode: jest.fn(),
    signInWithPassword: jest.fn(async () => ({ userId: 'user-1' })),
    requestPasswordReset: jest.fn(),
    setNewPassword: jest.fn(),
    signOut: jest.fn(),
    ...overrides,
  };
}

describe('loginService', () => {
  let gateway: AuthGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = createGatewayStub();
    jest.mocked(createJuntossAuthGateway).mockReturnValue(gateway);
  });

  it('solo confirma las credenciales; la carga de datos sucede tras abrir sesión', async () => {
    await login({ email: 'a@b.com', password: 'secret1234' });

    expect(gateway.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret1234',
    });
  });
});
