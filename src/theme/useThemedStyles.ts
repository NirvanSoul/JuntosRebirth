import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import type { ColorTokens } from '@/theme/types';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

type StyleValue = ViewStyle | TextStyle | ImageStyle;

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ColorTokens) => T,
): T {
  const { colors } = useTheme();

  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}

export function useThemedStyleSheet<T extends Record<string, StyleValue>>(
  factory: (colors: ColorTokens) => T,
): T {
  const { colors } = useTheme();

  return useMemo(() => factory(colors), [colors, factory]);
}
