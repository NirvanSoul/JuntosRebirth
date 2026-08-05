import { render, type RenderOptions } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme/ThemeProvider';
import type { AppearancePreference } from '@/theme/types';

const defaultMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

type RenderWithThemeOptions = RenderOptions & {
  appearance?: AppearancePreference;
};

export function renderWithTheme(
  ui: ReactElement,
  { appearance = 'light', ...options }: RenderWithThemeOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider initialMetrics={defaultMetrics}>
        <ThemeProvider initialAppearance={appearance}>{children}</ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
