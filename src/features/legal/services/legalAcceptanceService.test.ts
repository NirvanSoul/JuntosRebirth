import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { recordLegalAcceptance } from '@/features/legal/services/legalAcceptanceService';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/features/legal/services/authenticatedUser');
jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { post: jest.fn(async () => undefined) },
}));

const mockedUserId = jest.mocked(getAuthenticatedUserId);
const mockedPost = jest.mocked(apiClient.post);

const acceptance = {
  documentId: 'privacy-policy' as const,
  documentVersion: '2026-08-01',
  locale: 'es-ES',
  source: 'onboarding',
};

describe('recordLegalAcceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registra la aceptación sin enviar el identificador del usuario', async () => {
    mockedUserId.mockResolvedValue('user-1');

    await recordLegalAcceptance(acceptance);

    // El usuario lo deduce la API de la sesión: enviarlo permitiría firmar
    // una aceptación en nombre de otro.
    expect(mockedPost).toHaveBeenCalledWith('/v1/me/legal-acceptances', {
      appVersion: '0.1.0',
      documentType: 'privacy-policy',
      documentVersion: '2026-08-01',
      locale: 'es-ES',
      source: 'onboarding',
    });
  });

  it('no registra nada en modo invitado', async () => {
    mockedUserId.mockResolvedValue(null);

    await recordLegalAcceptance(acceptance);

    // La evidencia se guarda contra una cuenta, no contra un dispositivo.
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('propaga un fallo del registro con un mensaje legible', async () => {
    mockedUserId.mockResolvedValue('user-1');
    mockedPost.mockRejectedValueOnce(new Error('Revisa los datos.'));

    await expect(recordLegalAcceptance(acceptance)).rejects.toThrow(
      'No pudimos registrar la aceptación: Revisa los datos.',
    );
  });
});
