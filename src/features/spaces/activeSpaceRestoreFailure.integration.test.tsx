import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { SQLiteDatabase } from 'expo-sqlite';

import { Text } from '@/components/ui/Text/Text';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import {
  saveSpaces,
  updateSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import type { Space } from '@/features/spaces/types';
import { restoreRemoteAccount } from '@/features/sync/services/restoreRemoteAccount';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { listRemoteSpaces } from '@/services/api/spaces';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('@/features/auth/hooks/useAuthSession');
jest.mock('@/lib/storage/localDatabase');
jest.mock('@/services/api/spaces');

const personalSpace: Space = {
  id: 'personal-local',
  name: 'Personal',
  type: 'personal',
  currency: 'EUR',
};
const coupleSpace: Space = {
  id: 'couple-local',
  name: 'Juntos',
  type: 'couple',
  currency: 'EUR',
};
const Drawer = createDrawerNavigator<{ Main: undefined }>();

function SpacesHarness() {
  const { activeSpace, isReady, selectSpace, spaces } = useSpaces();
  const [isMenuOpen, setMenuOpen] = useState(true);

  if (!isReady) return null;

  return (
    <>
      <Text testID="active-space-id" variant="label">
        {activeSpace.id}
      </Text>
      <Pressable
        accessibilityLabel="Abrir espacios"
        accessibilityRole="button"
        onPress={() => setMenuOpen(true)}
      >
        <Text variant="label">Abrir espacios</Text>
      </Pressable>
      {isMenuOpen ? (
        <SpaceSideMenu
          activeSpaceId={activeSpace.id}
          onClose={() => setMenuOpen(false)}
          onCreateSpace={jest.fn()}
          onInvitePartner={jest.fn()}
          onOpenSettings={jest.fn()}
          onSelectSpace={selectSpace}
          spaces={spaces}
        />
      ) : null}
    </>
  );
}

function renderSpacesHarness() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <SpacesHarness />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function SpacesDrawerHarness() {
  const { activeSpace, createSpace, isReady, selectSpace, spaces } =
    useSpaces();

  if (!isReady) return null;

  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={({ navigation }) => (
          <SpaceSideMenu
            activeSpaceId={activeSpace.id}
            onClose={() => navigation.closeDrawer()}
            onCreateSpace={createSpace}
            onInvitePartner={jest.fn()}
            onOpenSettings={jest.fn()}
            onSelectSpace={selectSpace}
            spaces={spaces}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Drawer.Screen name="Main">
          {({ navigation }) => (
            <>
              <Text testID="drawer-active-space-id" variant="label">
                {activeSpace.id}
              </Text>
              <Pressable
                accessibilityLabel="Abrir selector de espacios"
                accessibilityRole="button"
                onPress={() => navigation.openDrawer()}
              >
                <Text variant="label">Abrir selector</Text>
              </Pressable>
            </>
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

function renderSpacesDrawerHarness() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <SpacesDrawerHarness />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('selección de espacio durante una restauración fallida', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.mocked(useAuthSession).mockReturnValue({
      isReady: true,
      session: {
        user: { id: 'user-1', email: 'a@b.com', name: 'Ada' },
        session: {},
      } as ReturnType<typeof useAuthSession>['session'],
      userId: 'user-1',
    });
    // Evita que la comprobación secundaria de `/v1/spaces` altere el catálogo
    // mientras la prueba controla la carrera entre selección y snapshot.
    jest.mocked(listRemoteSpaces).mockReturnValue(new Promise(() => undefined));
    await saveSpaces({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace, coupleSpace],
    });
  });

  it('mantiene el check en Juntos al reabrir tras el fallo SQLite', async () => {
    let signalLinksRead: (() => void) | undefined;
    const linksRead = new Promise<void>((resolve) => {
      signalLinksRead = resolve;
    });
    let releaseLinks: ((rows: []) => void) | undefined;
    const linksGate = new Promise<[]>((resolve) => {
      releaseLinks = resolve;
    });
    const database = {
      getAllAsync: jest.fn(
        async (_sql: string, _userId: string, entityType: string) => {
          if (entityType !== 'space') return [];
          signalLinksRead?.();
          return linksGate;
        },
      ),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      withExclusiveTransactionAsync: jest
        .fn()
        .mockRejectedValue(
          new Error(
            'UNIQUE constraint failed: transactions.recurrence_series_id, transactions.occurred_on',
          ),
        ),
    } as unknown as SQLiteDatabase;
    jest.mocked(getLocalDatabase).mockResolvedValue(database);

    const firstRender = await renderSpacesHarness();
    await waitFor(() =>
      expect(
        firstRender.getByLabelText('Seleccionar espacio Personal').props
          .accessibilityState?.checked,
      ).toBe(true),
    );

    const restoring = restoreRemoteAccount({
      userId: 'user-1',
      snapshot: {
        serverTime: '2026-09-12T10:00:00.000Z',
        activeFinancialContextId: null,
        spaces: [
          {
            remoteId: 'personal-remote',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
            activatedAt: '2026-08-01T00:00:00.000Z',
          },
          {
            remoteId: 'couple-remote',
            name: 'Juntos',
            type: 'couple',
            currency: 'EUR',
            activatedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
        categories: [],
        moneyAccounts: [],
        recurringSeries: [],
        transactions: [],
      },
    });
    const failedRestore = expect(restoring).rejects.toThrow(
      'UNIQUE constraint failed',
    );
    await linksRead;

    await fireEvent.press(
      firstRender.getByLabelText('Seleccionar espacio Juntos'),
    );
    await waitFor(() =>
      expect(
        firstRender.queryByLabelText('Seleccionar espacio Juntos'),
      ).toBeNull(),
    );
    expect(firstRender.getByTestId('active-space-id')).toHaveTextContent(
      coupleSpace.id,
    );

    releaseLinks?.([]);
    await failedRestore;
    await firstRender.unmount();

    const reopened = await renderSpacesHarness();
    await waitFor(() =>
      expect(
        reopened.getByLabelText('Seleccionar espacio Juntos').props
          .accessibilityState?.checked,
      ).toBe(true),
    );
    expect(
      reopened.getByLabelText('Seleccionar espacio Personal').props
        .accessibilityState?.checked,
    ).toBe(false);
  });

  it('refleja inmediatamente un catálogo restaurado fuera del hook', async () => {
    const screen = await renderSpacesHarness();
    await waitFor(() =>
      expect(screen.getByTestId('active-space-id')).toHaveTextContent(
        personalSpace.id,
      ),
    );

    await act(async () => {
      await updateSpaces((stored) => ({
        ...stored,
        activeSpaceId: coupleSpace.id,
      }));
    });

    await waitFor(() =>
      expect(screen.getByTestId('active-space-id')).toHaveTextContent(
        coupleSpace.id,
      ),
    );
  });

  it('repara una selección antigua y permite cambiar de espacio sin borrar datos', async () => {
    await AsyncStorage.setItem(
      '@juntoss/spaces/v1',
      JSON.stringify({
        version: 2,
        activeSpaceId: 'space-id-that-no-longer-exists',
        spaces: [personalSpace, coupleSpace],
      }),
    );

    const screen = await renderSpacesHarness();
    await waitFor(() =>
      expect(screen.getByTestId('active-space-id')).toHaveTextContent(
        personalSpace.id,
      ),
    );

    await fireEvent.press(screen.getByLabelText('Seleccionar espacio Juntos'));

    await waitFor(() =>
      expect(screen.getByTestId('active-space-id')).toHaveTextContent(
        coupleSpace.id,
      ),
    );
    await expect(
      AsyncStorage.getItem('@juntoss/spaces/v1').then((raw) =>
        JSON.parse(raw!),
      ),
    ).resolves.toMatchObject({ activeSpaceId: coupleSpace.id });
  });

  it('cambia Personal → Juntos → Personal con el drawer real', async () => {
    const screen = await renderSpacesDrawerHarness();
    const activeSpace = () => screen.getByTestId('drawer-active-space-id');
    const openDrawer = () =>
      fireEvent.press(screen.getByLabelText('Abrir selector de espacios'));
    const spaceRow = (name: string) =>
      screen.getByLabelText(`Seleccionar espacio ${name}`, {
        includeHiddenElements: true,
      });

    await waitFor(() =>
      expect(activeSpace()).toHaveTextContent(personalSpace.id),
    );
    await openDrawer();
    await fireEvent.press(spaceRow('Juntos'));
    await waitFor(() =>
      expect(activeSpace()).toHaveTextContent(coupleSpace.id),
    );

    await openDrawer();
    expect(spaceRow('Juntos').props.accessibilityState?.checked).toBe(true);
    expect(spaceRow('Personal').props.accessibilityState?.checked).toBe(false);
    await fireEvent.press(spaceRow('Personal'));
    await waitFor(() =>
      expect(activeSpace()).toHaveTextContent(personalSpace.id),
    );

    await openDrawer();
    expect(spaceRow('Personal').props.accessibilityState?.checked).toBe(true);
    expect(spaceRow('Juntos').props.accessibilityState?.checked).toBe(false);
  });

  it('actualiza el drawer montado tras una restauración externa y permite volver a Personal', async () => {
    const screen = await renderSpacesDrawerHarness();
    const activeSpace = () => screen.getByTestId('drawer-active-space-id');
    const openDrawer = () =>
      fireEvent.press(screen.getByLabelText('Abrir selector de espacios'));
    const spaceRow = (name: string) =>
      screen.getByLabelText(`Seleccionar espacio ${name}`, {
        includeHiddenElements: true,
      });

    await waitFor(() =>
      expect(activeSpace()).toHaveTextContent(personalSpace.id),
    );
    await act(async () => {
      await updateSpaces((stored) => ({
        ...stored,
        activeSpaceId: coupleSpace.id,
      }));
    });
    await waitFor(() =>
      expect(activeSpace()).toHaveTextContent(coupleSpace.id),
    );

    await openDrawer();
    expect(spaceRow('Juntos').props.accessibilityState?.checked).toBe(true);
    expect(spaceRow('Personal').props.accessibilityState?.checked).toBe(false);
    await fireEvent.press(spaceRow('Personal'));

    await waitFor(() =>
      expect(activeSpace()).toHaveTextContent(personalSpace.id),
    );
    await openDrawer();
    expect(spaceRow('Personal').props.accessibilityState?.checked).toBe(true);
    expect(spaceRow('Juntos').props.accessibilityState?.checked).toBe(false);
  });
});
