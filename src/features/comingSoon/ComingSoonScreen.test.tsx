import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { ComingSoonScreen } from '@/features/comingSoon/ComingSoonScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

it('abre la propuesta seleccionada y permite consultar otra tras cerrar', async () => {
  const screen = await renderWithTheme(<ComingSoonScreen />);
  expect(screen.queryByLabelText('Metas. Próximamente')).toBeNull();
  await fireEvent.press(
    screen.getByLabelText('Escáner de facturas. Próximamente'),
  );
  expect(await screen.findByText(/fotografiar una factura/)).toBeTruthy();
  expect(
    screen.getByLabelText('Enviar ideas por correo sobre Escáner de facturas'),
  ).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Cerrar'));
  await fireEvent.press(
    screen.getByLabelText('Chat de voz con IA. Próximamente'),
  );
  expect(await screen.findByText(/usar la voz/)).toBeTruthy();
  expect(
    screen.getByLabelText('Enviar ideas por correo sobre Chat de voz con IA'),
  ).toBeTruthy();
});

it('permite enviar una idea general sin abrir una función', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  try {
    const screen = await renderWithTheme(<ComingSoonScreen />, {
      appearance: 'dark',
    });
    expect(
      screen.getByLabelText('Lo que viene lo construiremos Juntos.'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('coming-soon-logo', { includeHiddenElements: true }),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByLabelText('Compartir una idea por correo'),
    );
    const url = new URL(openURL.mock.calls[0]?.[0] ?? '');
    expect(url.pathname).toBe('aora.estudio.o@gmail.com');
    expect(url.searchParams.get('subject')).toBe(
      'Ideas para Juntos: nuevas funciones',
    );
  } finally {
    openURL.mockRestore();
  }
});
