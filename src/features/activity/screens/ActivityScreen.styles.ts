import { StyleSheet } from 'react-native';

import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';

export function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    movementSummary: {
      marginBottom: spacing.lg,
    },
  });
}
