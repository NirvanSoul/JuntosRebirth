import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  loadPendingLegalAcceptance,
  savePendingLegalAcceptance,
} from '@/features/legal/persistence/pendingLegalAcceptanceRepository';
import {
  resetLegalSessionGateForTests,
  useLegalSessionGate,
} from '@/features/legal/hooks/useLegalSessionGate';
import type { PendingLegalAcceptanceNew } from '@/features/legal/model/types';

/**
 * El mock de sesión usa estado real de React y expone su setter, de modo que la
 * prueba reproduce la transición que produce Supabase: el OTP crea la sesión a
 * mitad del flujo y la puerta legal la habilita después. Congelar `session:
 * null` ocultaría exactamente el defecto que esta prueba protege.
 */
let mockSetSession: ((session: Session | null) => void) | null = null;
let mockSetReady: ((ready: boolean) => void) | null = null;
let mockReady = true;

/**
 * Sesión cruda presente desde el primer render (p. ej. reapertura de la app).
 * Permite reproducir la ventana en la que el snapshot del ámbito de módulo aún
 * es el «no-session» del invitado mientras ya existe una sesión sin comprobar.
 */
let mockInitialSession: Session | null = null;

jest.mock('@/features/auth/hooks/useAuthSession', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    useAuthSession: () => {
      const [session, setSession] = React.useState<Session | null>(
        mockInitialSession,
      );
      const [ready, setReady] = React.useState(mockReady);
      mockSetSession = setSession;
      mockSetReady = setReady;
      return { isReady: ready, session, userId: session?.user.id ?? null };
    },
  };
});

const mockSignOut = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({ signOut: mockSignOut }),
}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
let acceptedRows: { document_type: string; document_version: string }[];

jest.mock('@/app/config/environment', () => ({
  supabaseEnvironment: {
    url: 'https://proyecto.supabase.co',
    publishableKey: 'pk-test',
  },
}));

jest.mock('@/lib/supabase/supabaseClient', () => ({
  getConfiguredSupabaseClient: () => ({
    auth: { getUser: jest.fn() },
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  }),
}));

function acceptanceBuilder() {
  const builder = {
    eq: jest.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve().then(() =>
        resolve({ data: acceptedRows, error: null }),
      ),
  };
  mockSelect.mockReturnValue(builder);
  return builder;
}

function createOtpSession(email: string): Session {
  return {
    access_token: `access-token`,
    refresh_token: 'refresh-token',
    expires_at: 9999999999,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  } as unknown as Session;
}

async function aparecerSesion(session: Session) {
  await act(async () => {
    mockSetSession?.(session);
  });
}

const newIntention: PendingLegalAcceptanceNew = {
  email: 'ana@ejemplo.com',
  locale: 'es-ES',
  source: 'invitation-signup',
  appVersion: '0.1.0',
  documents: [
    {
      documentId: 'terms-of-service',
      documentVersion: '2026.1',
      action: 'accepted',
    },
    {
      documentId: 'privacy-policy',
      documentVersion: '2026.1',
      action: 'consulted',
    },
  ],
};

describe('useLegalSessionGate — sesión legalmente habilitada', () => {
  beforeEach(async () => {
    resetLegalSessionGateForTests();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockSetSession = null;
    mockSetReady = null;
    mockReady = true;
    mockInitialSession = null;
    acceptedRows = [];
    mockInsert.mockImplementation(async (row: Record<string, unknown>) => {
      acceptedRows.push({
        document_type: String(row.document_type),
        document_version: String(row.document_version),
      });
      return { error: null };
    });
    mockSignOut.mockResolvedValue(undefined);
  });

  it('el invitado no exige aceptación remota', async () => {
    const { result } = await renderHook(() => useLegalSessionGate());

    await waitFor(() => expect(result.current.gateReady).toBe(true));
    expect(result.current.isLegallyEnabled).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.status.kind).toBe('no-session');
  });

  it('una sesión sin evidencia de las versiones vigentes exige la puerta legal', async () => {
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('required'));
    expect(result.current.isLegallyEnabled).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.missingDocuments).toEqual([
      'terms-of-service',
      'privacy-policy',
    ]);
  });

  it('el OTP de registro consume la intención guardada y habilita la sesión', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    await waitFor(() => expect(result.current.isLegallyEnabled).toBe(true));
    expect(result.current.session?.user.id).toBe('user-1');
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('una intención de otro correo no habilita esta sesión y se conserva', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('otra@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('required'));
    expect(await loadPendingLegalAcceptance()).not.toBeNull();
  });

  it('una cuenta al día entra sin puerta ni parpadeo de estado', async () => {
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2026.1' },
    ];
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    expect(result.current.isLegallyEnabled).toBe(true);
    expect(result.current.missingDocuments).toEqual([]);
  });

  it('un fallo de inserción es observable, conserva la intención y el reintento la consume', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptanceBuilder();
    mockInsert
      .mockImplementationOnce(async () => ({
        error: { message: 'sin conexión' },
      }))
      .mockImplementation(async (row: Record<string, unknown>) => {
        acceptedRows.push({
          document_type: String(row.document_type),
          document_version: String(row.document_version),
        });
        return { error: null };
      });
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('required'));
    expect(result.current.error).not.toBeNull();
    expect(await loadPendingLegalAcceptance()).not.toBeNull();

    await act(async () => {
      result.current.retryGate();
    });

    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    await waitFor(() => expect(result.current.isLegallyEnabled).toBe(true));
    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('submitRegularization registra los documentos pendientes y habilita la puerta', async () => {
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('required'));

    await act(async () => {
      await result.current.submitRegularization({
        acceptedTerms: true,
        consultedPrivacy: true,
      });
    });

    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ document_type: 'privacy-policy' }),
    );
  });

  it('abandonar cierra solo la sesión local y vuelve al flujo de acceso', async () => {
    acceptanceBuilder();
    mockSignOut.mockImplementation(async () => {
      mockSetSession?.(null);
    });
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('required'));

    await act(async () => {
      await result.current.abandonSession();
    });

    expect(mockSignOut).toHaveBeenCalledWith('local');
    await waitFor(() => expect(result.current.session).toBeNull());
    await waitFor(() => expect(result.current.isLegallyEnabled).toBe(true));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('una intención de otro correo no bloquea una cuenta que ya está al día: se conserva para su titular (B1)', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2026.1' },
    ];
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('otra@ejemplo.com'));

    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    expect(result.current.isLegallyEnabled).toBe(true);
    // La intención de «ana» se conserva intacta (aún podría verificar su correo).
    expect(await loadPendingLegalAcceptance()).not.toBeNull();
  });

  it('una sesión cruda presente desde el primer render nunca aparece como habilitada antes de comprobarse (B2)', async () => {
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2026.1' },
    ];
    acceptanceBuilder();
    // La puerta aún no «está lista» (como al arrancar la app): el snapshot
    // sigue siendo el del invitado mientras ya existe una sesión cruda.
    mockReady = false;
    mockInitialSession = createOtpSession('ana@ejemplo.com');
    const { result } = await renderHook(() => useLegalSessionGate());

    // El «no-session» del invitado y «sesión sin comprobar» son estados
    // distintos: con sesión cruda, la vista nunca se reporta habilitada ni
    // como «no-session», aunque el ámbito de módulo aún no haya comprobado.
    expect(result.current.isLegallyEnabled).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.status.kind).not.toBe('no-session');

    // Cuando la puerta está lista, comprueba y despeja la sesión.
    await act(async () => {
      mockSetReady?.(true);
    });
    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    expect(result.current.isLegallyEnabled).toBe(true);
  });

  it('un cierre de sesión tras una pausa de recuperación libera la pausa para el siguiente inicio (B3)', async () => {
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));
    await waitFor(() => expect(result.current.status.kind).toBe('required'));

    await act(async () => {
      result.current.setRecoveryHalted(true);
    });
    expect(result.current.status.kind).toBe('halted');

    // Cancelar la recuperación cierra solo la sesión local: la pausa se libera
    // y el siguiente inicio vuelve a comprobar (no queda colgada para nadie).
    await act(async () => {
      mockSetSession?.(null);
    });
    await waitFor(() => expect(result.current.status.kind).toBe('no-session'));

    await aparecerSesion(createOtpSession('otra@ejemplo.com'));
    await waitFor(() => expect(result.current.status.kind).toBe('required'));
    expect(result.current.rawSession?.user.email).toBe('otra@ejemplo.com');
  });

  it('submitRegularization rechaza una decisión que no cubre los documentos pendientes (B4)', async () => {
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    await aparecerSesion(createOtpSession('ana@ejemplo.com'));
    await waitFor(() => expect(result.current.status.kind).toBe('required'));

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.submitRegularization({
          acceptedTerms: true,
          consultedPrivacy: false,
        });
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('la comprobación más reciente gana si llega una sesión nueva durante la consulta (B5)', async () => {
    let resolveFirstQuery: ((value: unknown) => void) | null = null;
    const firstQueryGate = new Promise<unknown>((resolve) => {
      resolveFirstQuery = resolve;
    });
    const deferredFirst = {
      eq: jest.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => firstQueryGate.then(resolve),
    };
    mockSelect.mockReturnValueOnce(deferredFirst);
    acceptanceBuilder();
    const { result } = await renderHook(() => useLegalSessionGate());

    // «a» comprueba primero (consulta en vuelo), «b» llega después.
    await act(async () => {
      mockSetSession?.(createOtpSession('a@ejemplo.com'));
    });
    await act(async () => {
      mockSetSession?.(createOtpSession('b@ejemplo.com'));
    });

    // «a» no tiene evidencia; «b» sí. Gana la sesión más reciente.
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2026.1' },
    ];
    await act(async () => {
      resolveFirstQuery?.({ data: [], error: null });
    });

    await waitFor(() => expect(result.current.status.kind).toBe('cleared'));
    expect(result.current.session?.user.email).toBe('b@ejemplo.com');
  });
});
