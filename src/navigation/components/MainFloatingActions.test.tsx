import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MainFloatingActions } from '@/navigation/components/MainFloatingActions';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { layout } from '@/theme/layout';

function renderActions(areSpaceActionsBlocked = false) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <MainFloatingActions
          areSpaceActionsBlocked={areSpaceActionsBlocked}
          isCreateButtonVisible
          onCreatePress={jest.fn()}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('MainFloatingActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mantiene únicamente la acción global de creación', async () => {
    const screen = await renderActions();
    const bottom = 34 + layout.floatingActionTabOffset;

    expect(
      StyleSheet.flatten(
        screen.getByTestId('floating-create-button-container').props.style,
      ),
    ).toMatchObject({ bottom });
    expect(screen.queryByTestId('map-floating-controls')).toBeNull();
  });

  it('oculta creación cuando las acciones del espacio están bloqueadas', async () => {
    const screen = await renderActions(true);

    expect(
      screen.getByTestId('floating-create-button-container', {
        includeHiddenElements: true,
      }).props.pointerEvents,
    ).toBe('none');
  });
});
