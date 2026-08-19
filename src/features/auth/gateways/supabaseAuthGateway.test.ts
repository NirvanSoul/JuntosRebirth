import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AccountLockedError,
  createSupabaseAuthGateway,
} from '@/features/auth/gateways/supabaseAuthGateway';

function createFakeClient(
  overrides: Record<string, jest.Mock> = {},
  functionsOverrides: Record<string, jest.Mock> = {},
) {
  return {
    auth: {
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
      signInWithPassword: jest.fn(),
      setSession: jest.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      ...overrides,
    },
    functions: {
      invoke: jest.fn(),
      ...functionsOverrides,
    },
  } as unknown as SupabaseClient;
}

function fakeFunctionsErrorResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('supabaseAuthGateway', () => {
  it('traduce credenciales inválidas de login-with-lockout a un mensaje en español', async () => {
    const client = createFakeClient(
      {},
      {
        invoke: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Function returned non-2xx status'),
          response: fakeFunctionsErrorResponse(
            { error: 'invalid_credentials' },
            401,
          ),
        }),
      },
    );
    const gateway = createSupabaseAuthGateway(client);

    await expect(
      gateway.signInWithPassword({ email: 'a@b.com', password: 'x' }),
    ).rejects.toThrow('Correo o contraseña incorrectos.');
  });

  it('lanza AccountLockedError cuando login-with-lockout reporta bloqueo', async () => {
    const lockedUntil = '2026-08-11T12:00:00.000Z';
    const client = createFakeClient(
      {},
      {
        invoke: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Function returned non-2xx status'),
          response: fakeFunctionsErrorResponse(
            { error: 'locked', lockedUntil },
            423,
          ),
        }),
      },
    );
    const gateway = createSupabaseAuthGateway(client);

    const rejection = gateway.signInWithPassword({
      email: 'a@b.com',
      password: 'x',
    });
    await expect(rejection).rejects.toBeInstanceOf(AccountLockedError);
    await expect(rejection).rejects.toThrow(
      'Por tu seguridad, debes esperar 1 hora antes de volver a intentarlo.',
    );
  });

  it('cae en un mensaje genérico y no filtra el texto crudo de la API cuando el código no es conocido', async () => {
    const client = createFakeClient({
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: {
          code: 'unexpected_failure',
          message: 'Some raw English text straight from GoTrue',
        },
      }),
    });
    const gateway = createSupabaseAuthGateway(client);

    await expect(
      gateway.signUp({ email: 'a@b.com', password: 'x', displayName: 'A' }),
    ).rejects.toThrow('No pudimos crear tu cuenta.');
    await expect(
      gateway.signUp({ email: 'a@b.com', password: 'x', displayName: 'A' }),
    ).rejects.not.toThrow('Some raw English text');
  });

  it('resuelve con el userId e hidrata la sesión cuando el inicio de sesión es correcto', async () => {
    const setSession = jest.fn().mockResolvedValue({ error: null });
    const client = createFakeClient(
      { setSession },
      {
        invoke: jest.fn().mockResolvedValue({
          data: {
            session: { access_token: 'at', refresh_token: 'rt' },
            userId: 'user-1',
          },
          error: null,
          response: undefined,
        }),
      },
    );
    const gateway = createSupabaseAuthGateway(client);

    await expect(
      gateway.signInWithPassword({ email: 'a@b.com', password: 'x' }),
    ).resolves.toEqual({ userId: 'user-1' });
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('rechaza el inicio de sesión si login-with-lockout no devuelve sesión ni error', async () => {
    const client = createFakeClient(
      {},
      {
        invoke: jest.fn().mockResolvedValue({
          data: null,
          error: null,
          response: undefined,
        }),
      },
    );
    const gateway = createSupabaseAuthGateway(client);

    await expect(
      gateway.signInWithPassword({ email: 'a@b.com', password: 'x' }),
    ).rejects.toThrow('No pudimos iniciar sesión.');
  });

  it('reenviar el código de recuperación reutiliza resetPasswordForEmail, no resend', async () => {
    const resend = jest.fn();
    const resetPasswordForEmail = jest
      .fn()
      .mockResolvedValue({ data: {}, error: null });
    const client = createFakeClient({ resend, resetPasswordForEmail });
    const gateway = createSupabaseAuthGateway(client);

    await gateway.resendRecoveryCode('a@b.com');

    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.com');
    expect(resend).not.toHaveBeenCalled();
  });

  it('reenviar el código de registro llama a resend con type signup', async () => {
    const resend = jest.fn().mockResolvedValue({ data: {}, error: null });
    const client = createFakeClient({ resend });
    const gateway = createSupabaseAuthGateway(client);

    await gateway.resendSignUpCode('a@b.com');

    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.com' });
  });

  it('onAuthStateChange delega la suscripción y su cancelación al cliente', () => {
    const unsubscribe = jest.fn();
    const onAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
    const client = createFakeClient({ onAuthStateChange });
    const gateway = createSupabaseAuthGateway(client);

    const callback = jest.fn();
    const subscription = gateway.onAuthStateChange(callback);
    subscription.unsubscribe();

    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('el cierre de sesión por defecto mantiene el alcance global', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const client = createFakeClient({ signOut });
    const gateway = createSupabaseAuthGateway(client);

    await gateway.signOut();

    expect(signOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('el cierre local pide a Supabase solo el alcance local', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const client = createFakeClient({ signOut });
    const gateway = createSupabaseAuthGateway(client);

    await gateway.signOut('local');

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('el cierre de sesión traduce el error de Supabase a un mensaje en español', async () => {
    const signOut = jest.fn().mockResolvedValue({
      error: { code: 'unexpected_failure', message: 'Raw GoTrue error' },
    });
    const client = createFakeClient({ signOut });
    const gateway = createSupabaseAuthGateway(client);

    await expect(gateway.signOut('local')).rejects.toThrow(
      'No pudimos cerrar sesión.',
    );
  });
});
