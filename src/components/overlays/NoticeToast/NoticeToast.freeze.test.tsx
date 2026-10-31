import { PortalHost, PortalProvider } from '@gorhom/portal';
import { act } from '@testing-library/react-native';
import { Freeze } from 'react-freeze';

import {
  NoticeToast,
  noticeToastHostName,
} from '@/components/overlays/NoticeToast/NoticeToast';
import { renderWithTheme } from '@/test/renderWithTheme';
import { motion } from '@/theme/motion';

// El portal real: el simulado de `setup.ts` pinta en el sitio y metería la
// tarjeta dentro de la pantalla congelada.
jest.mock('@gorhom/portal', () => jest.requireActual('@gorhom/portal'));
jest.mock('@/lib/haptics/haptics', () => ({ triggerHaptic: jest.fn() }));

const notice = { id: 8, message: 'Movimiento copiado' };

/** Como las pestañas con `freezeOnBlur`: la pantalla del aviso se congela. */
function renderScreen(frozen: boolean, onDismiss: (id: number) => void) {
  return (
    <PortalProvider>
      <Freeze freeze={frozen}>
        <NoticeToast notice={notice} onDismiss={onDismiss} />
      </Freeze>
      <PortalHost name={noticeToastHostName} />
    </PortalProvider>
  );
}

describe('NoticeToast con la pantalla congelada', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('se retira aunque la pantalla que lo lanzó deje de estar a la vista', async () => {
    const onDismiss = jest.fn();
    const screen = await renderWithTheme(renderScreen(false, onDismiss));
    expect(screen.getByTestId('notice-toast')).toBeTruthy();

    await screen.rerender(renderScreen(true, onDismiss));
    await act(() => jest.advanceTimersByTime(motion.toastVisibleDuration));

    expect(
      screen.queryByTestId('notice-toast', { includeHiddenElements: true }),
    ).toBeNull();
  });
});
