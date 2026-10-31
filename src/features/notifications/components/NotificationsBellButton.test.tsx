import type { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationsBellButton } from '@/features/notifications/components/NotificationsBellButton';
import type { UpcomingNoticesController } from '@/features/notifications/hooks/useUpcomingNotices';
import type { Space } from '@/features/spaces/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';

const mockNotices: { current: UpcomingNoticesController } = {
  current: { hasUnseen: false, markAllSeen: jest.fn(), notices: [] },
};

jest.mock('@/features/notifications/hooks/useUpcomingNotices', () => ({
  useUpcomingNotices: () => mockNotices.current,
}));

const spaces: Space[] = [
  { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
  { id: 'juntos', name: 'Juntos', type: 'couple', currency: 'EUR' },
];

async function renderBell(
  upcomingNotices: Partial<UpcomingNoticesController> = {},
) {
  mockNotices.current = {
    hasUnseen: false,
    markAllSeen: jest.fn(),
    notices: [],
    ...upcomingNotices,
  };
  const props: ComponentProps<typeof NotificationsBellButton> = {
    activeSpaceId: 'personal',
    categories: [],
    onOpenTransaction: jest.fn(),
    onSelectSpace: jest.fn(async () => undefined),
    spaces,
    transactions: [],
  };

  return {
    props,
    screen: await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NotificationsBellButton {...props} />
        </ThemeProvider>
      </SafeAreaProvider>,
    ),
  };
}

describe('NotificationsBellButton', () => {
  it('marca la campana con un punto cuando hay avisos sin ver', async () => {
    const { screen } = await renderBell({ hasUnseen: true });

    expect(
      screen.getByTestId('notifications-bell-dot', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('notifications-bell-icon').props.style,
      ).color,
    ).toBe(colors.cta);
  });

  it('no muestra el punto sin avisos nuevos', async () => {
    const { screen } = await renderBell();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('notifications-bell-icon').props.style,
      ).color,
    ).toBe(colors.textPrimary);

    expect(
      screen.queryByTestId('notifications-bell-dot', {
        includeHiddenElements: true,
      }),
    ).toBeNull();
  });

  it('abre los avisos y los marca como vistos', async () => {
    const markAllSeen = jest.fn();
    const { screen } = await renderBell({ hasUnseen: true, markAllSeen });

    await fireEvent.press(screen.getByLabelText('Notificaciones'));

    expect(markAllSeen).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('notifications-empty')).toBeTruthy();
  });

  it('abre el detalle de un aviso de otro espacio tras cambiar a ese espacio', async () => {
    const notice = {
      key: 'rent:2026-11-29:2',
      category: null,
      daysUntil: 2,
      threadKey: 'series:rent:2026-11-29',
      transaction: {
        id: 'rent',
        createdBy: 'user-test',
        spaceId: 'juntos',
        categoryId: 'home',
        type: 'expense' as const,
        amountMinor: 80_000,
        currency: 'EUR' as const,
        title: 'Alquiler',
        occurredOn: '2026-11-29',
        recurrence: 'monthly' as const,
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    };
    const { props, screen } = await renderBell({
      hasUnseen: true,
      notices: [notice],
    });

    await fireEvent.press(screen.getByLabelText('Notificaciones'));
    expect(
      await screen.findByTestId('notifications-section-day-2'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Alquiler'));

    await waitFor(() =>
      expect(props.onOpenTransaction).toHaveBeenCalledWith('rent'),
    );
    expect(props.onSelectSpace).toHaveBeenCalledWith('juntos');
  });
});
