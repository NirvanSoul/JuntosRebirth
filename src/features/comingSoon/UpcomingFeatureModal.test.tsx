import { Alert, Linking } from 'react-native';

import { openFeatureFeedback } from '@/features/comingSoon/UpcomingFeatureModal';

describe('correo de ideas para próximas funciones', () => {
  afterEach(() => jest.restoreAllMocks());

  it('abre un borrador con destinatario y asunto de la función codificados', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await openFeatureFeedback('Escáner de facturas');
    const url = new URL(openURL.mock.calls[0]?.[0] ?? '');
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('aora.estudio.o@gmail.com');
    expect(url.searchParams.get('subject')).toBe(
      'Ideas para Juntos: Escáner de facturas',
    );
    expect(url.searchParams.get('body')).toContain('Sobre Escáner de facturas');
  });

  it('ofrece la dirección si el dispositivo no puede abrir el correo', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Unavailable'));
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    await openFeatureFeedback('Préstamos');
    expect(alert).toHaveBeenCalledWith(
      'No pudimos abrir tu correo',
      expect.stringContaining('aora.estudio.o@gmail.com'),
    );
  });
});
