import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { ReactNode, RefObject } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActivityScreen } from '@/features/activity/screens/ActivityScreen';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';

const mockScrollTo = jest.fn();

type MockScreenProps = {
  children: ReactNode;
  scrollRef?: RefObject<{ scrollTo: typeof mockScrollTo } | null>;
  testID?: string;
};

jest.mock('@/components/layout/Screen/Screen', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const { View: MockView } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Screen: ({ children, scrollRef, testID }: MockScreenProps) => {
      mockReact.useImperativeHandle(scrollRef, () => ({
        scrollTo: mockScrollTo,
      }));

      return mockReact.createElement(MockView, { testID }, children);
    },
  };
});

const categories: Category[] = [
  {
    id: 'general',
    spaceId: 'personal',
    name: 'General',
    icon: 'dots-three-circle',
    colorToken: 'slate',
    isDefault: false,
    isArchived: false,
  },
];

const transactions: SessionTransaction[] = [
  {
    id: 'current-month',
    createdBy: 'install-test',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 1250,
    currency: 'EUR',
    title: 'Compra actual',
    categoryId: 'general',
    occurredOn: '2026-07-30',
    recurrence: 'once',
    updatedAt: '2026-07-30T12:00:00.000Z',
  },
  {
    id: 'previous-month',
    createdBy: 'install-test',
    spaceId: 'personal',
    type: 'expense',
    amountMinor: 4200,
    currency: 'EUR',
    title: 'Compra anterior',
    categoryId: 'general',
    occurredOn: '2026-06-15',
    recurrence: 'once',
    updatedAt: '2026-06-15T12:00:00.000Z',
  },
];

describe('ActivityScreen scroll dirigido', () => {
  beforeEach(() => {
    mockScrollTo.mockClear();
  });

  it('no repite el autoscroll al cambiar de mes después de atender el destino', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <ActivityScreen
            categories={categories}
            targetRequestId={1}
            targetSection="movements"
            transactions={transactions}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent(screen.getByTestId('activity-movements-header'), 'layout', {
      nativeEvent: { layout: { height: 48, width: 342, x: 0, y: 700 } },
    });
    await waitFor(() =>
      expect(mockScrollTo).toHaveBeenCalledWith({ animated: false, y: 700 }),
    );

    const chart = screen.getByTestId('category-donut-chart');
    await fireEvent.press(
      within(chart).getByRole('button', { name: 'Ver mes anterior' }),
    );
    await fireEvent(screen.getByTestId('activity-movements-header'), 'layout', {
      nativeEvent: { layout: { height: 48, width: 342, x: 0, y: 640 } },
    });
    await fireEvent.press(
      within(chart).getByRole('button', { name: 'Ver mes siguiente' }),
    );
    await fireEvent(screen.getByTestId('activity-movements-header'), 'layout', {
      nativeEvent: { layout: { height: 48, width: 342, x: 0, y: 700 } },
    });

    expect(mockScrollTo).toHaveBeenCalledTimes(1);
  });
});
