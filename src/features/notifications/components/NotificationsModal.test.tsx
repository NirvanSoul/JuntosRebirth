import { fireEvent } from '@testing-library/react-native';
import { type MeasureInWindowOnSuccessCallback, View } from 'react-native';

import { PreviewActionsContext } from '@/components/overlays/PreviewActions/previewActions';
import { NotificationsModal } from '@/features/notifications/components/NotificationsModal';
import type { UpcomingNotice } from '@/features/notifications/utils/upcomingNotices';
import { renderWithTheme } from '@/test/renderWithTheme';

const notice: UpcomingNotice = {
  key: 'rent:2026-11-29:1',
  category: null,
  daysUntil: 1,
  threadKey: 'rent:2026-11-29',
  transaction: {
    id: 'rent',
    createdBy: 'user-test',
    spaceId: 'personal',
    categoryId: 'home',
    type: 'expense',
    amountMinor: 80_000,
    currency: 'EUR',
    title: 'Alquiler',
    occurredOn: '2026-11-29',
    recurrence: 'once',
    updatedAt: '2026-10-01T12:00:00.000Z',
  },
};

describe('NotificationsModal', () => {
  it('abre las acciones de un aviso con una pulsación larga', async () => {
    const openPreviewActions = jest.fn();
    const { getByTestId, getByText } = await renderWithTheme(
      <PreviewActionsContext.Provider value={openPreviewActions}>
        <NotificationsModal
          coupleSpace={null}
          notices={[notice]}
          onClose={jest.fn()}
          onOpenNotice={jest.fn()}
          spaceLabels={new Map([['personal', 'Personal']])}
          visible
        />
      </PreviewActionsContext.Provider>,
    );

    expect(getByText('En 1 día')).toBeTruthy();
    // El entorno de pruebas no mide vistas: se simula la posición en ventana.
    const measure = jest
      .spyOn(
        View.prototype as {
          measureInWindow: (callback: MeasureInWindowOnSuccessCallback) => void;
        },
        'measureInWindow',
      )
      .mockImplementation((callback) => callback(20, 400, 60, 74));
    await fireEvent(getByTestId('transaction-preview-card'), 'longPress');
    measure.mockRestore();

    expect(openPreviewActions).toHaveBeenCalledWith(
      { kind: 'transaction', id: 'rent' },
      expect.anything(),
      expect.any(Function),
      true,
    );
  });

  it('agrupa por semana y mes y pliega cada sección desde su subtítulo', async () => {
    const weekly: UpcomingNotice = {
      ...notice,
      key: 'gym:2026-12-03:5',
      daysUntil: 5,
      threadKey: 'gym:2026-12-03',
      transaction: { ...notice.transaction, id: 'gym', title: 'Gimnasio' },
    };
    const monthly: UpcomingNotice = {
      ...notice,
      key: 'salary:2026-12-20:22',
      daysUntil: 22,
      threadKey: 'salary:2026-12-20',
      transaction: {
        ...notice.transaction,
        id: 'salary',
        title: 'Nómina',
        type: 'income',
      },
    };
    const { getByTestId, getByText, queryByText } = await renderWithTheme(
      <NotificationsModal
        coupleSpace={null}
        notices={[notice, weekly, monthly]}
        onClose={jest.fn()}
        onOpenNotice={jest.fn()}
        spaceLabels={new Map([['personal', 'Personal']])}
        visible
      />,
    );

    expect(getByText('Dentro de 1 semana')).toBeTruthy();
    expect(getByText('Dentro de 1 mes')).toBeTruthy();
    expect(getByText('Gimnasio')).toBeTruthy();

    await fireEvent.press(getByTestId('notifications-section-toggle-week'));
    expect(queryByText('Gimnasio')).toBeNull();
    expect(getByText('Nómina')).toBeTruthy();

    await fireEvent.press(getByTestId('notifications-section-toggle-week'));
    expect(getByText('Gimnasio')).toBeTruthy();
  });
});
