import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  LegalAcceptanceMissingConfigError,
  recordLegalAcceptance,
} from '@/features/legal/services/legalAcceptanceService';

// Sin configuración de Supabase: la app en modo invitado no tiene entorno.
jest.mock('@/app/config/environment', () => ({ supabaseEnvironment: null }));

const mockInsert = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/supabaseClient', () => ({
  getConfiguredSupabaseClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: jest.fn(), insert: mockInsert }),
  }),
}));

describe('legalAcceptanceService — errores observables', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('sin configuración de Supabase, registrar evidencia es un error tipado, no un silencio', async () => {
    await expect(
      recordLegalAcceptance({
        documentId: 'terms-of-service',
        documentVersion: '2026.1',
        locale: 'es-ES',
        source: 'access-signup',
        appVersion: '0.1.0',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceMissingConfigError);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
