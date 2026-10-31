import { PortalHost, PortalProvider } from '@gorhom/portal';

import {
  NoticeToast,
  noticeToastHostName,
} from '@/components/overlays/NoticeToast/NoticeToast';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.unmock('@gorhom/portal');

describe('NoticeToast con el portal real', () => {
  it('se pinta en su host aunque el proveedor de hojas renombre el host raíz', async () => {
    // Igual que BottomSheetModalProvider: su host raíz no se llama `root`.
    const screen = await renderWithTheme(
      <PortalProvider rootHostName="bottom-sheet-portal-test">
        <PortalHost name={noticeToastHostName} />
        <NoticeToast
          notice={{ id: 1, message: 'Gasto agregado', placement: 'bottom' }}
          onDismiss={jest.fn()}
        />
      </PortalProvider>,
    );

    expect(await screen.findByLabelText('Gasto agregado')).toBeTruthy();
  });
});
