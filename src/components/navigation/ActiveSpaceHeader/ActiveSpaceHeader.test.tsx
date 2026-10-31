import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActiveSpaceHeader } from '@/components/navigation/ActiveSpaceHeader/ActiveSpaceHeader';
import { ThemeProvider } from '@/theme/ThemeProvider';

async function renderHeader(trailingAction?: ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <ActiveSpaceHeader
          currencyFlag="🇪🇸"
          onSpacePress={jest.fn()}
          spaceName="Personal"
          trailingAction={trailingAction}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('ActiveSpaceHeader', () => {
  it('muestra la acción final junto al botón de moneda', async () => {
    const screen = await renderHeader(<Text testID="bell">campana</Text>);

    expect(screen.getByTestId('home-currency-flag-button')).toBeTruthy();
    expect(screen.getByTestId('bell')).toBeTruthy();
  });

  it('se pinta sin acción final', async () => {
    const screen = await renderHeader();

    expect(screen.queryByTestId('bell')).toBeNull();
    expect(screen.getByText('Personal')).toBeTruthy();
  });
});
