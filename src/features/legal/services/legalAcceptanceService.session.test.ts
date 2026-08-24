import {
  LegalAcceptanceMissingSessionError,
  recordLegalAcceptance,
} from '@/features/legal/services/legalAcceptanceService';

jest.mock('@/app/config/environment', () => ({
  supabaseEnvironment: {
    url: 'https://proyecto.supabase.co',
    publishableKey: 'pk-test',
  },
}));

const mockInsert = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/supabaseClient', () => ({
  getConfiguredSupabaseClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: jest.fn(), insert: mockInsert }),
  }),
}));

describe('legalAcceptanceService — sesión ausente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('sin sesión autenticada, el registro expone un error tipado y no inserta', async () => {
    await expect(
      recordLegalAcceptance({
        documentId: 'terms-of-service',
        documentVersion: '2026.1',
        locale: 'es-ES',
        source: 'access-signup',
        appVersion: '0.1.0',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceMissingSessionError);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
