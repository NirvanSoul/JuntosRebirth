import { syncOwnDefaultCurrency } from '@/features/profile/services/syncOwnDefaultCurrency';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();
const mockEq = jest.fn<
  Promise<{ error: Error | null }>,
  [column: string, value: string]
>(async () => ({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ update: mockUpdate }));

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/lib/supabase/supabaseClient', () => ({
  getConfiguredSupabaseClient: () => ({ from: mockFrom }),
}));

describe('syncOwnDefaultCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-ana');
    mockEq.mockResolvedValue({ error: null });
  });

  it('publica la primera moneda activa en el perfil propio', async () => {
    await expect(syncOwnDefaultCurrency('VES')).resolves.toBe(true);

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ default_currency: 'VES' });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-ana');
  });

  it('no toca Supabase en modo invitado', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    await expect(syncOwnDefaultCurrency('EUR')).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('conserva la preferencia local cuando la publicación falla', async () => {
    mockEq.mockResolvedValue({ error: new Error('sin red') });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(syncOwnDefaultCurrency('USD')).resolves.toBe(false);
  });
});
